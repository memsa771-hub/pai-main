import json
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal
from app.utils.openai_client import call_deepseek
from app.agents.retention_agents import run_gap_analysis

def enrich_profile_from_chat(user_id: int, user_message: str, ai_reply: str) -> None:
    """
    Profile Agent (Background Task).
    Extracts all key profile details (goals, skills, languages, education, work experience, projects,
    demographics) from the latest user message & AI response in a parallel background process,
    resolves duplicates, and dynamically synthesizes professional career goals and summary if missing.
    """
    print(f"[Profile Agent] Asynchronously enriching profile for User ID {user_id}...")
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            print(f"[Profile Agent] User {user_id} not found.")
            return

        # 1. Format profile context for extraction
        from app.agents.conversation_agent import format_profile_for_prompt
        profile_vault = format_profile_for_prompt(user)

        extract_prompt = (
            "You are an Information Extraction Agent. Review the user's message, the AI's reply, and the current profile. "
            "Identify if the student provided any new details. Extract into the following structured fields:\n"
            "- Basic info: phone, linkedin, dob, gender, nationality, country, city, gpa, intended_destination, intended_degree, preferred_field, current_status, current_education\n"
            "- goals: list of new goals/problems mentioned by the student (e.g. ['Study CS in Sweden', 'Apply to FAST university'])\n"
            "- skills: list of technical/hard skills mentioned\n"
            "- languages: list of spoken languages mentioned\n"
            "- education entries: degree, school, major (field of study), graduation_year, gpa\n"
            "- work experience: role, company, start_date, end_date, period, achievements (list of bullet-point impact statements)\n"
            "- projects: name, description, link_or_credential\n\n"
            "Return strictly a JSON containing only the new/updated fields. For example:\n"
            "{\n"
            "  \"gpa\": \"3.85\",\n"
            "  \"intended_destination\": \"Canada\",\n"
            "  \"goals\": [\"Study Computer Science in Canada\"],\n"
            "  \"skills\": [\"TensorFlow\"],\n"
            "  \"languages\": [\"Arabic\", \"French\"]\n"
            "}\n"
            "If no new information was provided, return strictly an empty JSON object: {}."
        )

        user_prompt = f"User Message: {user_message}\nAI Reply: {ai_reply}\nProfile:\n{profile_vault}"
        
        try:
            ex_res = call_deepseek(extract_prompt, user_prompt, temperature=0.1)
            clean_ex = ex_res.strip().replace("```json", "").replace("```", "").strip()
            updates = json.loads(clean_ex)
        except Exception as e:
            print(f"[Profile Agent] DeepSeek call failed or JSON parsing error: {e}")
            updates = {}

        if not updates:
            print("[Profile Agent] No profile updates found in message.")
            return

        print(f"[Profile Agent] Extracted updates: {updates}")
        
        # Save updates to DB
        updated_any = False

        if "skills" in updates and updates["skills"]:
            existing_skills = []
            try:
                if user.skills:
                    existing_skills = json.loads(user.skills)
            except:
                pass
            merged_skills = list(set(existing_skills + updates["skills"]))
            user.skills = json.dumps(merged_skills)
            del updates["skills"]
            updated_any = True

        if "languages" in updates and updates["languages"]:
            existing_languages = []
            try:
                if user.languages:
                    existing_languages = json.loads(user.languages)
            except:
                pass
            merged_languages = list(set(existing_languages + updates["languages"]))
            user.languages = json.dumps(merged_languages)
            del updates["languages"]
            updated_any = True

        if "goals" in updates and updates["goals"]:
            existing_goals = []
            try:
                if user.goals:
                    existing_goals = json.loads(user.goals)
            except:
                pass
            merged_goals = existing_goals
            for g in updates["goals"]:
                if g not in merged_goals:
                    merged_goals.append(g)
            user.goals = json.dumps(merged_goals)
            del updates["goals"]
            updated_any = True

        # Handle education entries
        if "education" in updates and updates["education"]:
            for edu in updates["education"]:
                # Check for duplicates
                dup = db.query(models.Education).filter(
                    models.Education.user_id == user.id,
                    models.Education.degree == edu.get("degree"),
                    models.Education.school == edu.get("school")
                ).first()
                if not dup:
                    db_edu = models.Education(
                        user_id=user.id,
                        degree=edu.get("degree"),
                        school=edu.get("school"),
                        major=edu.get("major"),
                        period=edu.get("period"),
                        graduation_year=edu.get("graduation_year"),
                        gpa=edu.get("gpa"),
                        details=edu.get("details")
                    )
                    db.add(db_edu)
                    updated_any = True
            del updates["education"]

        # Handle work experience entries
        if "work_experience" in updates and updates["work_experience"]:
            for exp in updates["work_experience"]:
                dup = db.query(models.WorkExperience).filter(
                    models.WorkExperience.user_id == user.id,
                    models.WorkExperience.role == exp.get("role"),
                    models.WorkExperience.company == exp.get("company")
                ).first()
                if not dup:
                    achievements = exp.get("achievements", [])
                    db_exp = models.WorkExperience(
                        user_id=user.id,
                        role=exp.get("role"),
                        company=exp.get("company"),
                        period=exp.get("period"),
                        start_date=exp.get("start_date"),
                        end_date=exp.get("end_date") or "Present",
                        description=exp.get("description"),
                        achievements=json.dumps(achievements) if achievements else "[]"
                    )
                    db.add(db_exp)
                    updated_any = True
            del updates["work_experience"]

        # Handle projects
        if "projects" in updates and updates["projects"]:
            for proj in updates["projects"]:
                dup = db.query(models.Project).filter(
                    models.Project.user_id == user.id,
                    models.Project.name == proj.get("name")
                ).first()
                if not dup:
                    db_proj = models.Project(
                        user_id=user.id,
                        name=proj.get("name"),
                        description=proj.get("description"),
                        link_or_credential=proj.get("link_or_credential")
                    )
                    db.add(db_proj)
                    updated_any = True
            del updates["projects"]

        # Handle other fields directly
        for k, v in updates.items():
            if hasattr(user, k) and v is not None and v != "null" and str(v).strip() != "":
                setattr(user, k, str(v))
                updated_any = True

        # Commit current changes first
        if updated_any:
            db.commit()
            db.refresh(user)
            print("[Profile Agent] Extracted data saved to database successfully.")

            # 2. Dynamic Profile Summary & Goals Synthesis
            if user.education or user.work_experience:
                print("[Profile Agent] Synthesizing professional profile summary & career goals...")
                
                # Fetch profile state again for synthesis context
                updated_profile_vault = format_profile_for_prompt(user)
                
                synthesis_prompt = (
                    "You are a Professional Career Branding Specialist. Review the student's academic/work profile details "
                    "and synthesize three fields:\n"
                    "1. A compelling, third-person professional summary (elevator pitch).\n"
                    "2. Strategic short-term career goals (next 1-3 years).\n"
                    "3. Visionary long-term career goals (next 5-10 years).\n\n"
                    "Return strictly a JSON object matching this schema (no markdown backticks, no comments):\n"
                    "{\n"
                    "  \"summary\": \"3-4 sentences summarizing achievements, skills, and aspirations...\",\n"
                    "  \"career_goals_short\": \"Concrete near-term professional/educational objectives...\",\n"
                    "  \"career_goals_long\": \"Ultimate long-term career aspirations...\"\n"
                    "}"
                )
                
                try:
                    synth_res = call_deepseek(synthesis_prompt, f"User Profile State:\n{updated_profile_vault}", temperature=0.3)
                    clean_synth = synth_res.strip().replace("```json", "").replace("```", "").strip()
                    synth_data = json.loads(clean_synth)
                    
                    if synth_data.get("summary"):
                        user.summary = synth_data["summary"]
                    if synth_data.get("career_goals_short"):
                        user.career_goals_short = synth_data["career_goals_short"]
                    if synth_data.get("career_goals_long"):
                        user.career_goals_long = synth_data["career_goals_long"]
                        
                    db.commit()
                    print("[Profile Agent] Summary & career goals synthesized and saved successfully.")
                except Exception as synth_err:
                    print(f"[Profile Agent] Synthesis failed: {synth_err}")
        else:
            print("[Profile Agent] No new attributes to save.")

    except Exception as ex:
        print(f"[Profile Agent] Failed in background enrichment: {ex}")
        db.rollback()
    finally:
        db.close()
