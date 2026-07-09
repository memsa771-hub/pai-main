import os
import requests
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

def call_deepseek(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    if not DEEPSEEK_API_KEY:
        print("[DeepSeek] Warning: DEEPSEEK_API_KEY is not configured in .env file.")
        raise ValueError("DeepSeek API key is missing. Configure DEEPSEEK_API_KEY in .env.")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        result_json = response.json()
        
        # Get content
        content = result_json["choices"][0]["message"]["content"]
        return content
    except Exception as e:
        print(f"[DeepSeek] API request failed: {e}")
        # Log response content if available for debugging
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"[DeepSeek] Error details: {response.text}")
        raise e
