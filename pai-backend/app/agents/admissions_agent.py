import json
from typing import Optional
from sqlalchemy.orm import Session
from app import models
from app.agents.research_agent import google_search, research_university
from app.agents.retention_agents import find_scholarships
from app.utils.openai_client import call_deepseek

def study_local(user: models.User, db: Session, user_message: str = "") -> dict:
    """
    Study Local Sub-Agent.
    Dynamically identifies the target university, searches Google for its latest 
    merit aggregate criteria/formulas, and performs the calculation based on the student's profile.
    """
    print(f"[Admissions / Study Local] Processing local admissions request...")
    
    # 1. Identify the target university from the user's message
    target_university = None
    if user_message:
        uni_extract_sys = (
            "You are a University Extraction Agent. Analyze the user's message to identify if they mentioned a specific "
            "Pakistani or local university/college they want to calculate merit for (e.g. FAST, NUST, GIKI, UET, MDCAT colleges).\n"
            "Return strictly a JSON object containing the identified university name or null if none is found:\n"
            "{\"university\": \"Name or null\"}"
        )
        try:
            ex_res = call_deepseek(uni_extract_sys, f"User Message: {user_message}", temperature=0.1)
            clean_ex = ex_res.strip().replace("```json", "").replace("```", "").strip()
            parsed_ex = json.loads(clean_ex)
            uni_name = parsed_ex.get("university")
            if uni_name and uni_name.lower() != "null":
                target_university = uni_name
        except Exception as e:
            print(f"[Admissions / Study Local] Extraction error: {e}")

    # 2. If not in message, check user's profile/tracked universities
    if not target_university:
        # Check user's intended destination if it's a specific local university
        if user.intended_destination and any(x in user.intended_destination.upper() for x in ["FAST", "NUST", "GIKI", "UET", "MDCAT", "PUNJAB"]):
            target_university = user.intended_destination
        else:
            # Check tracked universities
            tracked = db.query(models.TrackedUniversity).filter(models.TrackedUniversity.user_id == user.id).first()
            if tracked:
                target_university = tracked.name

    # 3. If still unspecified, ask the user instead of guessing
    if not target_university:
        return {
            "error": "unspecified_university",
            "message": "Which local university's merit aggregate calculation formula would you like me to look up? Please specify (e.g. FAST, NUST, GIKI, or UET) so I can search for the latest criteria."
        }

    print(f"[Admissions / Study Local] Dynamically calculating merit for {target_university} using SerpAPI...")
    
    # 4. Search Google via SerpAPI for the latest aggregate formula
    search_query = f"{target_university} admission merit aggregate calculation formula criteria 2026 requirements"
    snippets = google_search(search_query)
    search_context = "\n".join(snippets) if snippets else "No web results found. Use general historical information."
    
    # 5. Extract and format user profile details
    edu_list = []
    for e in user.education:
        edu_list.append({
            "degree": e.degree,
            "school": e.school,
            "major": e.major,
            "period": e.period,
            "gpa": e.gpa,
            "graduation_year": e.graduation_year,
            "details": e.details
        })
        
    profile_summary = {
        "full_name": user.full_name,
        "education": edu_list,
        "current_status": user.current_status,
        "current_education": user.current_education
    }
    
    # 6. Call DeepSeek to parse snippets and calculate merit
    system_prompt = (
        f"You are an expert Admissions Counselor and Merit Calculator for {target_university}.\n"
        "Analyze the provided search results to determine the official, latest aggregate formulas and criteria.\n"
        "Then, calculate the student's merit/aggregate score based on their academic profile.\n\n"
        "RULES:\n"
        "- Do NOT use hardcoded merit formulas. Base your calculation on the search snippets.\n"
        "- Parse the student's grades (FSc, Matric, O/A-Levels, high school GPA) from their profile. Convert GPAs to percentages if needed (e.g., 3.5/4.0 is approx 87.5% or use local equivalency rules from search results).\n"
        "- Since entry test scores are typically not in the profile, assume realistic competitive values (e.g. 70%, 135/200, 165/200 depending on the test requirements found) and specify them in your assumptions.\n"
        "- Return strictly a JSON object with this exact structure (no markdown backticks, no comments):\n"
        "{\n"
        "  \"university\": \"string (e.g. FAST University)\",\n"
        "  \"student_gpa_percentage\": \"string (e.g. 85.0%)\",\n"
        "  \"merit_estimate\": \"string (e.g. 74.5% based on formula: 75% test + 25% HSSC)\",\n"
        "  \"recommended_local_tracks\": [\"list of programs/departments user might qualify for\"],\n"
        "  \"assumptions\": [\"list of assumed test scores used for calculation\"],\n"
        "  \"formula_source\": \"brief description of formula found in search results\"\n"
        "}"
    )
    
    user_prompt = (
        f"Student Profile:\n{json.dumps(profile_summary, indent=2)}\n\n"
        f"Search Results Context:\n{search_context}"
    )
    
    try:
        res = call_deepseek(system_prompt, user_prompt, temperature=0.1)
        clean = res.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(clean)
        return parsed
    except Exception as e:
        print(f"[Admissions / Study Local] Error during dynamic merit calculation: {e}")
        return {
            "university": target_university,
            "student_gpa_percentage": "Unknown",
            "merit_estimate": "Failed to calculate dynamically.",
            "recommended_local_tracks": ["Information pending - please try again."],
            "assumptions": ["Could not parse search results."],
            "formula_source": "Dynamic SerpAPI lookup failed."
        }

def study_abroad(user: models.User, db: Session, user_message: str = "", active_sub_agents: list = []) -> dict:
    """
    Study Abroad Sub-Agent.
    Coordinates international research and scholarship finders.
    """
    print(f"[Admissions / Study Abroad] Processing international admissions request...")
    insights = {}
    
    # 1. Scholarship matching
    if "scholarship_finder" in active_sub_agents or "scholarship" in user_message.lower():
        insights["scholarships"] = find_scholarships(user)
        
    # 2. University Research matching
    if "university_researcher" in active_sub_agents or "research" in user_message.lower():
        research_detect_sys = (
            "You are a routing agent. Determine if the user is asking to search, research, find, suggest, or compare "
            "specific universities, courses, tuition fees, deadlines, or scholarships in a destination country. "
            "Return strictly a JSON object: {\"university\": \"Name or null\", \"program\": \"Major or null\"}."
        )
        uni_name = None
        program = None
        try:
            route_res = call_deepseek(research_detect_sys, f"User Input: {user_message}", temperature=0.1)
            clean_route = route_res.strip().replace("```json", "").replace("```", "").strip()
            route_data = json.loads(clean_route)
            uni_name = route_data.get("university")
            program = route_data.get("program")
        except Exception as e:
            print(f"[Admissions / Study Abroad] Research extraction failed: {e}")
            
        target_uni = uni_name if (uni_name and uni_name != "null") else (user.intended_destination or "Top Universities")
        target_program = program if (program and program != "null") else (user.preferred_field or "Graduate Study")
        
        try:
            print(f"[Admissions / Study Abroad] Routing to Research Agent: {target_uni} for {target_program}")
            research_recommendations = research_university(target_uni, target_program, user, db)
            insights["university_research"] = research_recommendations
            
            # Save tracked university record in background
            if uni_name and uni_name != "null":
                dup = db.query(models.TrackedUniversity).filter(
                    models.TrackedUniversity.user_id == user.id,
                    models.TrackedUniversity.name == research_recommendations["name"]
                ).first()
                if not dup:
                    db_uni = models.TrackedUniversity(
                        user_id=user.id,
                        name=research_recommendations["name"],
                        location=research_recommendations["location"],
                        avg_gpa=research_recommendations["avg_gpa"],
                        avg_gre=research_recommendations["avg_gre"],
                        deadlines=research_recommendations["deadlines"],
                        status="Interested",
                        acceptance_rate=research_recommendations["acceptance_rate"],
                        reqs=json.dumps(research_recommendations["scholarships"])
                    )
                    db.add(db_uni)
                    db.commit()
        except Exception as ex:
            print(f"[Admissions / Study Abroad] Research Agent failed: {ex}")
            
    return insights
