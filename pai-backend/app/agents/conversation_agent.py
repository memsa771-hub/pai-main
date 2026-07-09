import json
import uuid
import re
import datetime
from sqlalchemy.orm import Session
from app import models, schemas
from app.utils.openai_client import call_deepseek
from app.agents.research_agent import research_university

def is_casual_message(message: str) -> bool:
    """Detect brief greetings and small talk that should not trigger counselor intake mode."""
    normalized = re.sub(r"[^\w\s']", "", message.strip().lower()).strip()
    if not normalized:
        return True

    casual_phrases = {
        "hi", "hey", "hello", "hola", "yo", "sup", "hii", "heyy", "helloo",
        "good morning", "good afternoon", "good evening", "good night",
        "thanks", "thank you", "thx", "ty", "ok", "okay", "k", "cool", "nice",
        "great", "bye", "goodbye", "see you", "how are you", "whats up",
        "what's up", "hi there", "hey there", "hello there",
    }
    if normalized in casual_phrases:
        return True

    words = normalized.split()
    if len(words) <= 3 and any(w in {"hi", "hey", "hello", "thanks", "ok", "okay", "bye"} for w in words):
        return True

    return False

def build_casual_system_prompt(user: models.User) -> str:
    first_name = user.full_name.split()[0] if user.full_name else "there"
    return (
        "You are Placement AI (PAI), a friendly study-abroad assistant.\n"
        f"The student's first name is {first_name}.\n\n"
        "The user sent a brief, casual message — a greeting, thanks, or small talk.\n"
        "Reply the way a normal ChatGPT or DeepSeek assistant would: warm, natural, and short "
        "(usually 1-2 sentences).\n\n"
        "RULES:\n"
        "- Do NOT recite their profile, city, country, or study goals unless they asked.\n"
        "- Do NOT start building a roadmap or ask intake questions.\n"
        "- Do NOT ask more than one question, and only a light one like 'How can I help you today?'\n"
        "- Avoid bullet points, long paragraphs, and consultant jargon.\n"
        "- Be present and welcoming — not salesy, not like an onboarding form."
    )

def build_counselor_system_prompt(user: models.User, profile_vault: str, has_research: bool) -> str:
    research_rule = (
        "6. If research results are available, reference them and direct the user to the recommendations panel."
        if has_research
        else "6. If they ask about a school, offer to research it — do not invent stats."
    )
    return (
        "You are Placement AI (PAI), a study-abroad counselor and university strategist.\n"
        "You guide students toward international education — but you listen first.\n\n"
        f"CURRENT STUDENT PROFILE VAULT:\n{profile_vault}\n\n"
        "CRITICAL RULES:\n"
        "1. MATCH THE USER'S ENERGY. Short message → short reply. Detailed question → helpful, focused answer.\n"
        "2. NEVER repeat a question. If a detail is already in the PROFILE VAULT, do not ask for it again.\n"
        "3. NEVER fabricate fees, scores, or deadlines. If unsure, say you'll look it up.\n"
        "4. Be natural and concise — like a real counselor in chat, not a lecture or intake form.\n"
        "5. Ask at most ONE follow-up question when it genuinely helps. Never stack multiple questions.\n"
        f"{research_rule}\n\n"
        "What makes you different from generic chatbots: you are a counselor who makes students feel heard, "
        "never ignored or bored. Guide when they want guidance; don't push when they're just chatting."
    )

def format_profile_for_prompt(user: models.User) -> str:
    skills_list = []
    try:
        if user.skills:
            skills_list = json.loads(user.skills)
    except:
        pass
        
    edu_list = [{"degree": e.degree, "school": e.school, "gpa": e.gpa, "period": e.period} for e in user.education]
    work_list = [{"role": w.role, "company": w.company, "period": w.period} for w in user.work_experience]
    proj_list = [{"name": p.name} for p in user.projects]
    
    profile = {
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "dob": user.dob,
        "gender": user.gender,
        "nationality": user.nationality,
        "country": user.country,
        "city": user.city,
        "linkedin": user.linkedin,
        "current_education": user.current_education,
        "current_status": user.current_status,
        "intended_destination": user.intended_destination,
        "intended_degree": user.intended_degree,
        "preferred_field": user.preferred_field,
        "summary": user.summary,
        "skills": skills_list,
        "education": edu_list,
        "work_experience": work_list,
        "projects": proj_list
    }
    return json.dumps(profile, indent=2)

def handle_chat_conversation(user_message: str, session_id: str, user: models.User, db: Session) -> dict:
    # 1. Fetch/Create Session
    if not session_id or session_id == "session-empty":
        session_id = f"session-{uuid.uuid4().hex[:8]}"
        title = user_message[:22] + "..." if len(user_message) > 22 else user_message
        db_session = models.ChatSession(id=session_id, user_id=user.id, title=title)
        db.add(db_session)
        db.commit()
    else:
        db_session = db.query(models.ChatSession).filter(models.ChatSession.id == session_id).first()
        if not db_session:
            session_id = f"session-{uuid.uuid4().hex[:8]}"
            title = user_message[:22] + "..." if len(user_message) > 22 else user_message
            db_session = models.ChatSession(id=session_id, user_id=user.id, title=title)
            db.add(db_session)
            db.commit()
            
    # 2. Get past chat history
    history = db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).order_by(models.ChatMessage.timestamp.asc()).all()
    history_context = ""
    for msg in history[-10:]: # last 10 messages for context
        history_context += f"{msg.sender.upper()}: {msg.text}\n"

    # Save User message
    msg_id_u = f"msg-{uuid.uuid4().hex[:8]}"
    db_msg_u = models.ChatMessage(
        id=msg_id_u,
        session_id=session_id,
        sender="user",
        text=user_message,
        timestamp=datetime.datetime.now().strftime("%I:%M %p")
    )
    db.add(db_msg_u)
    db.commit()

    casual = is_casual_message(user_message)

    # 3. Dynamic Check: Did the user ask to research a program or university?
    # Skip for casual small talk — no need to route "hi" to the research agent.
    research_detect_sys = (
        "You are a routing agent. Determine if the user is asking to search, research, find, suggest, or compare "
        "specific universities, courses, tuition fees, deadlines, or scholarships in a destination country. "
        "Return strictly a JSON object: {\"is_research\": boolean, \"university\": \"Name or null\", \"program\": \"Major or null\"}."
    )
    is_research = False
    uni_name = None
    program = None
    
    if not casual:
        try:
            route_res = call_deepseek(research_detect_sys, f"User Input: {user_message}", temperature=0.1)
            clean_route = route_res.strip()
            if clean_route.startswith("```json"):
                clean_route = clean_route[7:]
            if clean_route.endswith("```"):
                clean_route = clean_route[:-3]
            clean_route = clean_route.strip()
            route_data = json.loads(clean_route)

            is_research = route_data.get("is_research", False)
            uni_name = route_data.get("university")
            program = route_data.get("program")
        except Exception as e:
            print(f"[Conversation] Routing extraction failed: {e}")
        
    research_recommendations = None
    if is_research:
        # Trigger Research Agent!
        target_uni = uni_name or user.intended_destination or "Top Universities"
        target_program = program or user.preferred_field or "Graduate Study"
        try:
            print(f"[Conversation] Routing to Research Agent: {target_uni} for {target_program}")
            research_recommendations = research_university(target_uni, target_program, user, db)
            
            # Save tracked university record in background
            # If a specific university is identified, save it as "Interested"
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
                    
                    # Log activity
                    activity_text = f"Added target track: {research_recommendations['name']}"
                    # Create notifications/recent activity
        except Exception as ex:
            print(f"[Conversation] Research Agent failed: {ex}")

    # 4. Generate AI Reply
    profile_vault = format_profile_for_prompt(user)

    if casual:
        system_prompt = build_casual_system_prompt(user)
    else:
        system_prompt = build_counselor_system_prompt(
            user, profile_vault, has_research=bool(research_recommendations)
        )
    
    user_prompt = f"Chat History:\n{history_context}\nUSER: {user_message}\n"
    if research_recommendations:
        user_prompt += f"\n[Research Panel Data Found: {json.dumps(research_recommendations)}]"

    try:
        ai_reply = call_deepseek(
            system_prompt,
            user_prompt,
            temperature=0.5 if casual else 0.3,
        )
    except Exception as e:
        ai_reply = "I'm sorry, I'm having trouble connecting to my strategist modules. Let me check the connection and try again."

    # Save AI message
    msg_id_a = f"msg-{uuid.uuid4().hex[:8]}"
    db_msg_a = models.ChatMessage(
        id=msg_id_a,
        session_id=session_id,
        sender="ai",
        text=ai_reply,
        timestamp=datetime.datetime.now().strftime("%I:%M %p")
    )
    db.add(db_msg_a)
    db.commit()

    # 5. Background Facts Extraction Pass
    # Scans the user message and updates profile details
    extract_prompt = (
        "You are an Information Extraction Agent. Review the user's message, the AI's reply, and the current profile. "
        "Identify if the student provided any new details (e.g. GPA, school, nationality, destination, preferred degree, "
        "skills, work experience, projects, LinkedIn url, Phone prefix). "
        "Return strictly a JSON containing only the new/updated fields. For example:\n"
        "{\n"
        "  \"gpa\": \"3.85\",\n"
        "  \"intended_destination\": \"Canada\",\n"
        "  \"skills\": [\"TensorFlow\"]\n"
        "}\n"
        "If no new information was provided, return strictly an empty JSON object: {}."
    )
    
    extract_user = f"User Message: {user_message}\nAI Reply: {ai_reply}\nProfile: {profile_vault}"
    
    try:
        ex_res = call_deepseek(extract_prompt, extract_user, temperature=0.1)
        clean_ex = ex_res.strip()
        if clean_ex.startswith("```json"):
            clean_ex = clean_ex[7:]
        if clean_ex.endswith("```"):
            clean_ex = clean_ex[:-3]
        clean_ex = clean_ex.strip()
        
        updates = json.loads(clean_ex)
        if updates:
            print(f"[Conversation] Background sync found profile updates: {updates}")
            
            # Save updates
            if "skills" in updates:
                # Merge skills
                existing_skills = []
                try:
                    if user.skills:
                        existing_skills = json.loads(user.skills)
                except:
                    pass
                merged_skills = list(set(existing_skills + updates["skills"]))
                user.skills = json.dumps(merged_skills)
                del updates["skills"]
                
            for k, v in updates.items():
                if hasattr(user, k) and v is not None and v != "null":
                    setattr(user, k, str(v))
                    
            db.commit()
            print("[Conversation] Vault updated in background.")
    except Exception as ex:
        print(f"[Conversation] Background extraction sync failed: {ex}")

    # Return response payload
    return {
        "session_id": session_id,
        "session_title": db_session.title,
        "reply": ai_reply,
        "message": {
            "id": msg_id_a,
            "sender": "ai",
            "text": ai_reply,
            "timestamp": db_msg_a.timestamp
        },
        "recommendations": research_recommendations
    }
