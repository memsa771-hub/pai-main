import json
import uuid
import re
import datetime
from sqlalchemy.orm import Session
from app import models, schemas
from app.utils.openai_client import call_deepseek
from app.orchestrator.kernel import route_intent_orchestrator
from app.agents import admissions_agent
from app.agents.retention_agents import run_gap_analysis

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

def build_pai_core_orchestrator_prompt(user: models.User, profile_vault: str) -> str:
    first_name = user.full_name.split()[0] if user.full_name else "student"
    
    # Parse goals & docs to check their state
    goals_list = []
    try:
        if user.goals:
            goals_list = json.loads(user.goals)
    except:
        pass
    
    docs_list = user.documents
    has_education = len(user.education) > 0
    
    if not goals_list:
        current_step_instruction = (
            "ONBOARDING STATUS: PHASE 1 - GOAL ACQUISITION\n"
            "- The student's goals vault is empty. Your absolute primary focus is to welcome the student and act as a warm academic Consultant.\n"
            "- Ask open-ended but guiding questions to understand what the student wants to achieve or what their main academic/career problem is (e.g., 'I want to study in Sweden' or 'I want to get admission in FAST').\n"
            "- Do NOT suggest specific universities, roadmaps, or helper features yet. Focus only on identifying their main goal(s).\n"
            "- Keep your tone conversational, consultant-like, and warm."
        )
    elif not docs_list and not has_education:
        current_step_instruction = (
            "ONBOARDING STATUS: PHASE 2 - DOCUMENT COLLECTION or PHASE 3 - MANUAL QUESTIONING\n"
            "- The student has specified goals, but has no uploaded documents and no education profile.\n"
            "- If you have NOT asked the user for documents yet, you MUST ask if they have any documents they can upload (e.g., resume, CV, or educational transcript) to help auto-fill their profile.\n"
            "- Explain that they can upload their documents directly using the upload button/area in the application.\n"
            "- If you ALREADY asked for documents in the chat history and the user said they don't have any (or prefer not to), you must transition to MANUAL QUESTIONING (Phase 3). Ask targeted questions one-by-one to extract their previous education (major, school, GPA), current state/status, and intended degree/field."
        )
    elif not has_education:
        current_step_instruction = (
            "ONBOARDING STATUS: PHASE 3 - MANUAL QUESTIONING (INTAKE)\n"
            "- The student has goals but doesn't have documents (or chose not to upload them) and their profile lacks education details.\n"
            "- Your main focus is to ask targeted questions one-by-one to extract key profile information.\n"
            "- Ask about their previous education (e.g., 'What is your current/previous degree, major, and GPA?'), their current state/status, or intended destination/field.\n"
            "- Keep it structured and ask one or two questions at a time so the student is not overwhelmed.\n"
            "- Capture these details to populate their profile."
        )
    else:
        current_step_instruction = (
            "ONBOARDING STATUS: HELPER MODE\n"
            "- The student's goals and academic history are populated. You are now shifting from Consultant to active Helper.\n"
            "- Assist them with their goal(s), suggest universities, explain visa requirements, trigger background sub-agents (like study_local or study_abroad), and answer their queries with detailed strategist insight."
        )

    return (
        "You are Placement AI (PAI), the central Agentic Operating System for student academic success.\n"
        f"You are collaborating with a student named {first_name}.\n\n"
        f"CURRENT STUDENT KNOWLEDGE VAULT:\n{profile_vault}\n\n"
        "YOUR CORE IDENTITY:\n"
        "- You are first a Consultant, and then a Helper. You guide students step-by-step through a structured intake flow before providing solutions.\n"
        "- You manage a suite of specialized background agents under the admissions domain: study_local (domestic placement, aggregate calculators) and study_abroad (international universities, scholarships, research).\n\n"
        f"{current_step_instruction}\n\n"
        "HUMAN CONSULTANT PERSONA & ENGAGEMENT RULES:\n"
        "- ACT LIKE A REAL HUMAN ACADEMIC CONSULTANT. Write with a warm, personal, and engaging tone. Avoid sounding like a machine or an LLM.\n"
        "- BAN LLM BOILERPLATE. Never say things like 'Certainly!', 'As an AI...', 'I am here to assist you', 'How may I help you today?', or 'Here is a detailed guide'. Just talk naturally.\n"
        "- DIALOG-DRIVEN FLOW. Keep your responses concise, readable, and conversational. Avoid writing long, dry walls of text. Only use bullet points or tables when presenting specific university options or merit aggregates; otherwise, write in natural, friendly paragraphs.\n"
        "- EMPATHIZE & VALIDATE. Validate the student's choices and empathize with their academic stress (e.g. 'Sweden is an amazing destination—the tech scene there is fantastic, so I completely see why you want to go!', 'Studying local engineering is tough, let's map this out step-by-step').\n"
        "- COLLABORATIVE VIBE. Make them feel like they are chatting with a friendly mentor who is sitting right across from them at a desk.\n\n"
        "CRITICAL EXECUTION RULES:\n"
        "1. ADHERE TO THE ONBOARDING PHASES. Do not offer solutions, map out roadmaps, or list matching universities if you are in Phase 1 or Phase 2.\n"
        "2. MATCH THE USER'S ENERGY. Short greeting -> short, warm response. Deep academic dilemma -> focused, thorough guidance.\n"
        "3. NEVER ask a question if the data point is already present in the STUDENT KNOWLEDGE VAULT.\n"
        "4. When in Helper Mode, act as an orchestrator: synthetically integrate observations from sub-agents (e.g., matching local merit metrics or international visa guidelines) into a unified conversation panel."
    )

def format_profile_for_prompt(user: models.User) -> str:
    skills_list = []
    try:
        if user.skills:
            skills_list = json.loads(user.skills)
    except:
        pass

    languages_list = []
    try:
        if user.languages:
            languages_list = json.loads(user.languages)
    except:
        pass

    goals_list = []
    try:
        if user.goals:
            goals_list = json.loads(user.goals)
    except:
        pass
        
    edu_list = []
    for e in user.education:
        edu_entry = {"degree": e.degree, "school": e.school, "gpa": e.gpa, "period": e.period}
        if e.major:
            edu_entry["major"] = e.major
        if e.graduation_year:
            edu_entry["graduation_year"] = e.graduation_year
        edu_list.append(edu_entry)

    work_list = []
    for w in user.work_experience:
        work_entry = {"role": w.role, "company": w.company, "period": w.period}
        if w.start_date:
            work_entry["start_date"] = w.start_date
        if w.end_date:
            work_entry["end_date"] = w.end_date
        achievements = []
        try:
            if w.achievements:
                achievements = json.loads(w.achievements)
        except:
            pass
        if achievements:
            work_entry["achievements"] = achievements
        work_list.append(work_entry)

    proj_list = []
    for p in user.projects:
        proj_entry = {"name": p.name}
        if p.description:
            proj_entry["description"] = p.description
        if p.link_or_credential:
            proj_entry["link_or_credential"] = p.link_or_credential
        proj_list.append(proj_entry)

    docs_list = []
    for d in user.documents:
        docs_list.append({
            "name": d.name,
            "type": d.type,
            "status": d.status
        })
    
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
        "languages": languages_list,
        "goals": goals_list,
        "education": edu_list,
        "work_experience": work_list,
        "projects": proj_list,
        "uploaded_documents": docs_list
    }
    return json.dumps(profile, indent=2)

def evaluate_quick_replies(ai_reply: str, user_message: str, profile_vault: str) -> dict:
    """
    Determines if the AI's reply requires specific structured data from the user.
    Only returns suggested_options when the AI is asking the user to choose from
    specific categories that would update their profile.
    """
    system_prompt = (
        "You are a UI Assistant that decides if quick-reply buttons should be shown to the user.\n\n"
        "RULES:\n"
        "- Return requires_profile_data=true ONLY when the AI reply is actively asking the user to choose "
        "between specific, structured options that will update their student profile.\n"
        "- Examples that SHOULD trigger options: choosing a destination country, selecting a degree level "
        "(Bachelor's/Master's/PhD), picking a career stage, choosing a budget tier, selecting a field of study.\n"
        "- Examples that should NOT trigger options: greetings, general advice, explaining a roadmap, "
        "open-ended questions like 'tell me about yourself', confirmations, follow-up explanations.\n"
        "- When triggered, provide 2-5 SHORT button labels (3-5 words each) as options.\n\n"
        "Return strictly a JSON object:\n"
        "{\"requires_profile_data\": boolean, \"suggested_options\": [\"Option 1\", \"Option 2\"]}\n"
        "If requires_profile_data is false, suggested_options must be an empty list []."
    )
    
    user_prompt = (
        f"AI Reply: {ai_reply}\n"
        f"User Message: {user_message}\n"
        f"Current Profile: {profile_vault}"
    )
    
    try:
        result = call_deepseek(system_prompt, user_prompt, temperature=0.1)
        clean = result.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()
        parsed = json.loads(clean)
        return {
            "requires_profile_data": parsed.get("requires_profile_data", False),
            "suggested_options": parsed.get("suggested_options", [])
        }
    except Exception as e:
        print(f"[Conversation] Quick-reply evaluation failed: {e}")
        return {"requires_profile_data": False, "suggested_options": []}

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

    # 3. Format the profile state from your database
    profile_vault = format_profile_for_prompt(user)

    # 4. Let the Orchestrator Kernel figure out who owns this request
    routing_decision = route_intent_orchestrator(user_message, profile_vault)
    domain = routing_decision.get("primary_domain", "casual")
    active_sub_agents = routing_decision.get("sub_agents", [])

    agent_insights = {}
    research_recommendations = None

    # 5. Dynamic Hand-off to Domain Agents
    if domain == "admissions":
        print("[Orchestrator] Invoking Admissions Agent System...")
        # Sub-agent: study_local
        if "study_local" in active_sub_agents or "merit" in user_message.lower():
            agent_insights["local_merit_calculations"] = admissions_agent.study_local(user, db, user_message)
        
        # Sub-agent: study_abroad
        if "study_abroad" in active_sub_agents or "scholarship_finder" in active_sub_agents or "university_researcher" in active_sub_agents or "research" in user_message.lower():
            abroad_insights = admissions_agent.study_abroad(user, db, user_message, active_sub_agents)
            agent_insights.update(abroad_insights)
            if "university_research" in abroad_insights:
                research_recommendations = abroad_insights["university_research"]
            
    elif domain == "profile_builder":
        print("[Orchestrator] Invoking Portfolio & Gap Analyst...")
        if "gap_analyst" in active_sub_agents or "gap" in user_message.lower():
            agent_insights["gap_analysis"] = run_gap_analysis(user, db)

    # 6. Generate AI Reply
    system_prompt = build_pai_core_orchestrator_prompt(user, profile_vault)
    
    user_prompt = f"Chat History:\n{history_context}\nUSER: {user_message}\n"
    if agent_insights:
        user_prompt += f"\n[System Background Insights Loaded: {json.dumps(agent_insights)}]"

    try:
        ai_reply = call_deepseek(
            system_prompt,
            user_prompt,
            temperature=0.5 if domain == "casual" else 0.3,
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

    # 7. Evaluate Quick Replies (only for non-casual messages)
    quick_reply_data = {"requires_profile_data": False, "suggested_options": []}
    if domain != "casual":
        quick_reply_data = evaluate_quick_replies(ai_reply, user_message, profile_vault)



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
        "recommendations": research_recommendations,
        "requires_profile_data": quick_reply_data["requires_profile_data"],
        "suggested_options": quick_reply_data["suggested_options"]
    }
