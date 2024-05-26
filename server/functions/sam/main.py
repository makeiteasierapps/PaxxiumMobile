import os
from flask import send_file
from dotenv import load_dotenv

load_dotenv()

# Google clouds file structure is different
if os.getenv('LOCAL_DEV') == 'True':
    from .BossAgent import BossAgent
else:
    from BossAgent import BossAgent

headers = {"Access-Control-Allow-Origin": "*"}
def cors_preflight_response():
    return ("", 204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Project-ID",
        "Access-Control-Max-Age": "3600",
    })

def handle_new_message(request):
    new_message = request.json['newMessage']
    boss_agent = BossAgent()
    get_text_response = boss_agent.get_full_response(new_message)
    boss_agent.stream_audio_response(get_text_response)
    return send_file('audio.mp3', mimetype='audio/mpeg')

def sam(request):
    if request.method == 'OPTIONS':
        return cors_preflight_response()
    
    if request.method == 'POST':
        return handle_new_message(request)

