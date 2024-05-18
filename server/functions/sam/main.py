import os
from dotenv import load_dotenv

headers = {"Access-Control-Allow-Origin": "*"}
load_dotenv()

# Google clouds file structure is different
if os.getenv('LOCAL_DEV') == 'True':
    from .BossAgent import BossAgent
else:
    from BossAgent import BossAgent

def cors_preflight_response():
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Project-ID",
        "Access-Control-Max-Age": "3600",
    }
    return ("", 204, cors_headers)

def handle_new_message(request):
    data = request.json()
    new_message = data['newMessage']
    boss_agent = BossAgent()
    get_text_response = boss_agent.get_full_response(new_message)
    response_generator = boss_agent.stream_audio_response(get_text_response)
    for chunk in response_generator:
        yield chunk

def sam(request):
    if request.method == 'OPTIONS':
        return cors_preflight_response()
    
    if request.method == 'POST':
        handle_new_message(request)

