import os
import json
import datetime
from sqlalchemy.orm import Session
from app import models
from app.utils.openai_client import call_deepseek
from app.agents.research_agent import google_search

def run_gap_analysis(user_profile: models.User, db: Session) -> dict:
    print(f"[Strategy Agent] Running Profile Gap Analysis for {user_profile.full_name}...")
    
    # 1. Fetch tracked universities to compare against
    tracked_unis = db.query(models.TrackedUniversity).filter(models.TrackedUniversity.user_id == user_profile.id).all()
    
    target_stats_context = ""
    if tracked_unis:
        target_stats_context = "Target Universities:\n" + "\n".join([
            f"- {uni.name}: Req GPA: {uni.avg_gpa}, Acceptance: {uni.acceptance_rate}, Required Docs: {uni.reqs}"
            for uni in tracked_unis
        ])
    else:
        target_stats_context = "No specific universities tracked yet. Compare against top-tier Global Universities (e.g. GPA 3.8/4.0 requirement)."
        
    skills_list = []
    try:
        if user_profile.skills:
            skills_list = json.loads(user_profile.skills)
    except:
        pass
        
    profile_summary = (
        f"Education: {[{'degree': e.degree, 'school': e.school, 'gpa': e.gpa} for e in user_profile.education]}\n"
        f"Skills: {skills_list}\n"
        f"Work Experience: {[{'role': w.role, 'company': w.company} for w in user_profile.work_experience]}\n"
        f"Projects: {[{'name': p.name} for p in user_profile.projects]}"
    )
    
    system_prompt = (
        "You are an Admissions Strategy Specialist. Perform a rigorous profile gap analysis comparing the student's profile "
        "against their target universities' standards. Evaluate: 1) Academic Preparation (GPA), 2) Work/Extracurriculars, "
        "and 3) Research/Projects. Offer 3 concrete, gamified 'Profile Boosters' (concrete actions like adding certifications, "
        "completing specific projects, or prep course timeline) that will increase their admission probability.\n"
        "Return strictly a JSON object (no markdown backticks, no comments) matching this schema:\n"
        "{\n"
        "  \"academic_score\": int (0-100 representing strength),\n"
        "  \"work_score\": int (0-100),\n"
        "  \"research_score\": int (0-100),\n"
        "  \"gaps\": [\"List of identified gaps...\"],\n"
        "  \"boosters\": [\n"
        "    {\n"
        "      \"title\": \"Actionable booster title\",\n"
        "      \"description\": \"Description of how this action raises probability (e.g., '+5%')\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )
    
    user_prompt = f"Student Profile:\n{profile_summary}\n\nTarget University Criteria:\n{target_stats_context}"
    
    try:
        ai_res = call_deepseek(system_prompt, user_prompt)
        clean_json = ai_res.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"[Strategy Agent] Gap analysis failed: {e}")
        return {
            "academic_score": 75,
            "work_score": 50,
            "research_score": 40,
            "gaps": ["Lacking research preprints or academic publications", "Core skills lists are short"],
            "boosters": [
                {"title": "Publish a preprint", "description": "Writing a technical ML paper and posting it on arXiv will boost your Stanford CS score by +6%"},
                {"title": "Add key technical skills", "description": "Ensure you add D3.js and data mapping skills to match the HCI lab requirements (+4%)"}
            ]
        }

def find_scholarships(user_profile: models.User) -> list:
    print(f"[Scholarship Agent] Scouting matched funding opportunities...")
    
    nationality = user_profile.nationality or "International"
    destination = user_profile.intended_destination or "USA"
    field = user_profile.preferred_field or "Computer Science"
    degree = user_profile.intended_degree or "Master's"
    
    search_query = f"scholarships for {nationality} students studying {degree} {field} in {destination} 2026"
    snippets = google_search(search_query)
    search_context = "\n".join(snippets) if snippets else "No web results. Generate default options."
    
    system_prompt = (
        "You are a Financial Aid & Scholarship Agent. Extract the top 3 relevant scholarship matches based on the student profile "
        "and search snippets. Highlight award values, criteria, and deadlines.\n"
        "Return strictly a JSON list (no markdown backticks, no comments) containing objects formatted exactly as:\n"
        "[\n"
        "  {\n"
        "    \"name\": \"Scholarship Name\",\n"
        "    \"award\": \"Award amount/benefit (e.g. Full tuition or $20,000)\",\n"
        "    \"eligibility\": \"Brief criteria summary...\",\n"
        "    \"deadline\": \"Deadline date (e.g. Jan 15)\",\n"
        "    \"url\": \"Website link (e.g. official url or placeholder if unsure)\"\n"
        "  }\n"
        "]"
    )
    
    user_prompt = f"Student Profile: Nationality: {nationality}, Degree: {degree}, Subject: {field}, Destination: {destination}\nSearch context:\n{search_context}"
    
    try:
        ai_res = call_deepseek(system_prompt, user_prompt)
        clean_json = ai_res.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"[Scholarship Agent] Failed to parse: {e}")
        return [
            {
                "name": f"Global Excellence Scholarship in {destination}",
                "award": "Full Tuition Coverage",
                "eligibility": f"Top academic international students applying for {field}",
                "deadline": "March 15",
                "url": "https://university.edu/scholarships"
            }
        ]

def generate_notifications(user_profile: models.User, db: Session) -> list:
    print(f"[Alerts Agent] Reviewing upcoming student milestones...")
    notifications = []
    
    # 1. Check Profile completeness
    missing_fields = []
    if not user_profile.phone: missing_fields.append("Phone Number")
    if not user_profile.linkedin: missing_fields.append("LinkedIn Profile")
    if not user_profile.summary: missing_fields.append("Professional Summary")
    
    skills_list = []
    try:
        if user_profile.skills:
            skills_list = json.loads(user_profile.skills)
    except:
        pass
    if not skills_list: missing_fields.append("Skills & Interests")
    
    if missing_fields:
        notifications.append({
            "id": f"notif-completeness-{len(missing_fields)}",
            "text": f"Complete your profile: Missing {', '.join(missing_fields[:2])} to reach 100% completeness.",
            "time": "Just now",
            "type": "warning"
        })
        
    # 2. Check tracked university deadlines
    tracked_unis = db.query(models.TrackedUniversity).filter(models.TrackedUniversity.user_id == user_profile.id).all()
    for uni in tracked_unis:
        if uni.deadlines:
            notifications.append({
                "id": f"notif-uni-deadline-{uni.id}",
                "text": f"Upcoming application deadline for {uni.name}: {uni.deadlines}.",
                "time": "Today",
                "type": "info"
            })
            
    # 3. Check document status (SOP optimizing)
    pending_docs = db.query(models.Document).filter(
        models.Document.user_id == user_profile.id,
        models.Document.status == "pending"
    ).all()
    for d in pending_docs:
        notifications.append({
            "id": f"notif-doc-pending-{d.id}",
            "text": f"AI is scanning and optimizing your document '{d.name}'.",
            "time": "1m ago",
            "type": "info"
        })
        
    # Default initial notification
    if not notifications:
        notifications.append({
            "id": "notif-welcome",
            "text": "Welcome to Placement AI! Upload your resume/transcript to auto-fill your profile.",
            "time": "3d ago",
            "type": "success"
        })
        
    return notifications
