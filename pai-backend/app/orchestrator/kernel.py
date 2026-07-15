import json
from app.utils.openai_client import call_deepseek

def route_intent_orchestrator(user_message: str, profile_vault: str) -> dict:
    """
    The Brain of the OS. Analyzes text to determine which Domain Agent
    and which micro Sub-Agents need to be triggered.
    """
    orchestrator_routing_prompt = (
        "You are the Intent Routing Kernel of Placement AI (Student OS).\n"
        "Analyze the user's message and their profile vault to determine which domain modules must execute.\n"
        "Available Domains:\n"
        "- 'admissions': University admissions. This has two sub-agents: 'study_local' (for local/domestic admissions, aggregates, and merit calculations) and 'study_abroad' (for international university research, admissions, and global scholarships).\n"
        "- 'profile_builder': Generating CVs, reviewing portfolio milestones, profile gaps.\n"
        "- 'casual': Simple pleasantries, greetings, open-ended talk.\n\n"
        "Return strictly a JSON object detailing the target domain and any micro sub-agents needed:\n"
        "{\n"
        "  \"primary_domain\": \"admissions\" | \"profile_builder\" | \"casual\",\n"
        "  \"sub_agents\": [\"study_local\", \"study_abroad\", \"scholarship_finder\", \"university_researcher\", \"gap_analyst\"],\n"
        "  \"context_extraction_required\": boolean\n"
        "}"
    )
    
    user_prompt = f"Student Profile:\n{profile_vault}\n\nUser Message: {user_message}"
    
    try:
        routing_res = call_deepseek(orchestrator_routing_prompt, user_prompt, temperature=0.1)
        # Clean markdown wraps if present
        clean_json = routing_res.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"[Kernel System Error] Routing failed, defaulting to casual. Error: {e}")
        return {"primary_domain": "casual", "sub_agents": [], "context_extraction_required": True}
