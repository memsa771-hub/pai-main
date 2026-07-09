import os
import json
import requests
from dotenv import load_dotenv
from app.utils.openai_client import call_deepseek
from sqlalchemy.orm import Session
from app import models

load_dotenv()

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

def google_search(query: str) -> list:
    if not SERPAPI_API_KEY:
        print("[Research] Warning: SERPAPI_API_KEY is not configured in .env.")
        return []
        
    url = "https://serpapi.com/search"
    params = {
        "q": query,
        "api_key": SERPAPI_API_KEY,
        "engine": "google",
        "num": 6
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        organic_results = data.get("organic_results", [])
        snippets = []
        for res in organic_results:
            title = res.get("title", "")
            snippet = res.get("snippet", "")
            snippet_details = res.get("snippet_highlighted_words", [])
            snippets.append(f"Title: {title}\nSnippet: {snippet}\n")
        return snippets
    except Exception as e:
        print(f"[Research] Serp API query failed: {e}")
        return []

def research_university(uni_name: str, program: str, user_profile: models.User, db: Session) -> dict:
    print(f"[Research] Running query for program: {program} at {uni_name}...")
    
    # Run Search
    search_query = f"{uni_name} {program} tuition fees admission requirements GPA deadline 2026"
    snippets = google_search(search_query)
    search_context = "\n".join(snippets) if snippets else "No web results found. Use general historical information."
    
    # 1. Extract Details via DeepSeek
    system_prompt = (
        "You are an Admissions Research Agent. Review the search results and extract the official program statistics. "
        "Return strictly a JSON object (no markdown backticks, no text). If details are not found in the search results, "
        "use realistic historical university data, but do not hallucinate wildly. Fields required:\n"
        "{\n"
        "  \"name\": \"University Name\",\n"
        "  \"location\": \"City, State/Country\",\n"
        "  \"avg_gpa\": \"Average GPA (e.g. 3.8/4.0)\",\n"
        "  \"avg_gre\": \"Average GRE or GMAT (e.g. 325 or GMAT 700)\",\n"
        "  \"deadlines\": \"Deadlines (e.g. Dec 15)\",\n"
        "  \"tuition\": \"Annual Tuition Fees (e.g. $45,000)\",\n"
        "  \"acceptance_rate\": \"Acceptance rate (e.g. 8%)\",\n"
        "  \"scholarships\": [\"Scholarship names or funding types...\"]\n"
        "}"
    )
    
    user_prompt = f"Target University: {uni_name}\nTarget Program: {program}\nSearch Snippets:\n{search_context}"
    
    try:
        extracted_res = call_deepseek(system_prompt, user_prompt)
        clean_json = extracted_res.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
        
        extracted_data = json.loads(clean_json)
    except Exception as e:
        print(f"[Research] Failed to extract university details: {e}")
        extracted_data = {
            "name": uni_name,
            "location": "Global Campus",
            "avg_gpa": "3.5/4.0",
            "avg_gre": "315/340",
            "deadlines": "Rolling",
            "tuition": "Contact University",
            "acceptance_rate": "15%",
            "scholarships": ["Federal Loans", "University Merit Aid"]
        }

    # 2. Calculate Admission Probability using DeepSeek
    # Retrieve user profile components
    skills_list = []
    try:
        if user_profile.skills:
            skills_list = json.loads(user_profile.skills)
    except:
        pass
        
    profile_summary = (
        f"Education: {[{'degree': e.degree, 'gpa': e.gpa} for e in user_profile.education]}\n"
        f"Skills: {skills_list}\n"
        f"Experience Roles: {[w.role for w in user_profile.work_experience]}\n"
        f"Projects: {[p.name for p in user_profile.projects]}"
    )
    
    probability_system = (
        "You are an Admissions Officer Agent. Compare the student's profile details with the university's average statistics. "
        "Rate their overall admission probability as a rating between 1 and 5 stars (1 = Low, 2 = Below Average, 3 = Average, 4 = High, 5 = Very High match). "
        "Return strictly a JSON object: {\"stars\": int} where stars is an integer from 1 to 5. "
        "Be realistic based on their GPAs and credentials."
    )
    
    probability_user = (
        f"Student Profile:\n{profile_summary}\n\n"
        f"Target University stats:\n"
        f"Name: {extracted_data['name']}\n"
        f"Avg GPA: {extracted_data['avg_gpa']}\n"
        f"Acceptance Rate: {extracted_data['acceptance_rate']}"
    )
    
    try:
        prob_res = call_deepseek(probability_system, probability_user)
        clean_prob = prob_res.strip()
        if clean_prob.startswith("```json"):
            clean_prob = clean_prob[7:]
        if clean_prob.endswith("```"):
            clean_prob = clean_prob[:-3]
        clean_prob = clean_prob.strip()
        
        prob_data = json.loads(clean_prob)
        extracted_data["stars"] = prob_data.get("stars", 3)
    except Exception:
        extracted_data["stars"] = 3 # default

    # 3. Generate Roadmap Sections & Steps using DeepSeek
    roadmap_system = (
        "You are an Academic strategist. Generate a customized application roadmap for this student "
        "applying to this program. Break the timeline into exactly 4 sections: 1. PREPARATION, 2. APPLICATION, 3. FINANCIALS, 4. DECISION. "
        "Create 2 to 3 concrete roadmap steps for each section, including a step title, description, priority (high/medium/low), "
        "and type (Testing, Resume, SOP, LOR, Financial, Visa). "
        "Return strictly a JSON list containing 4 sections with the format:\n"
        "[\n"
        "  {\n"
        "    \"number\": 1,\n"
        "    \"title\": \"PREPARATION\",\n"
        "    \"steps\": [\n"
        "      {\n"
        "        \"title\": \"GRE Quant Perfection\",\n"
        "        \"description\": \"Specific tips matching the program requirements...\",\n"
        "        \"priority\": \"high\",\n"
        "        \"type\": \"Testing\"\n"
        "      }\n"
        "    ]\n"
        "  }\n"
        "]"
    )
    
    roadmap_user = (
        f"Student: {user_profile.full_name}\n"
        f"Applying for: {program} at {uni_name}\n"
        f"Target Deadline: {extracted_data['deadlines']}"
    )
    
    try:
        road_res = call_deepseek(roadmap_system, roadmap_user)
        clean_road = road_res.strip()
        if clean_road.startswith("```json"):
            clean_road = clean_road[7:]
        if clean_road.endswith("```"):
            clean_road = clean_road[:-3]
        clean_road = clean_road.strip()
        
        roadmap_sections = json.loads(clean_road)
        
        # Save Roadmap to Database
        # Clean existing roadmaps for this user/uni combo first
        existing_sections = db.query(models.RoadmapSection).filter(
            models.RoadmapSection.user_id == user_profile.id,
            models.RoadmapSection.university == uni_name
        ).all()
        for es in existing_sections:
            db.delete(es)
        db.commit()
        
        # Insert new roadmap
        for sec in roadmap_sections:
            db_sec = models.RoadmapSection(
                user_id=user_profile.id,
                university=uni_name,
                degree=program,
                term="Fall 2026",
                progress=0,
                number=sec.get("number", 1),
                title=sec.get("title", "Prep")
            )
            db.add(db_sec)
            db.commit()
            db.refresh(db_sec)
            
            for idx, st in enumerate(sec.get("steps", [])):
                step_id = f"step-{db_sec.id}-{idx + 1}"
                db_step = models.RoadmapStep(
                    id=step_id,
                    section_id=db_sec.id,
                    title=st.get("title", "Roadmap Step"),
                    description=st.get("description", "Check admissions details"),
                    # Lock everything except the first step of Section 1 to guide them!
                    status="not_started" if (sec.get("number") == 1 and idx == 0) else "locked",
                    priority=st.get("priority", "medium"),
                    type=st.get("type", "Other")
                )
                db.add(db_step)
        db.commit()
        print("[Research] Dynamically created study-abroad roadmap.")
    except Exception as ex:
        print(f"[Research] Failed to generate roadmap: {ex}")
        
    return extracted_data
