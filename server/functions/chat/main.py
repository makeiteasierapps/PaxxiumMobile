import os
import json
from dotenv import load_dotenv
from flask import Response

load_dotenv()

if os.getenv('LOCAL_DEV') == 'True':
    from .ChatService import ChatService
    from .BossAgent import BossAgent
else:
    from ChatService import ChatService
    from BossAgent import BossAgent

headers = {"Access-Control-Allow-Origin": "*"}
def cors_preflight_response():
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Project-ID, X-API-Key",
        "Access-Control-Max-Age": "3600",
    }
    return ("", 204, cors_headers)

def check_api_key(request):
    api_key = request.headers.get('X-API-Key')
    if api_key == os.getenv('API_KEY'):
        return True
    else:
        return False
    
def handle_fetch_chats(request):
    user_id = request.headers.get('userId')
    return ChatService().get_all_chats(user_id)

def handle_create_chat(request):
    data = request.get_json()
    chat_service = ChatService()
    chat_id = chat_service.create_chat_in_db(data['userId'], data['chatName'], data['model'])
    return {
        'chatId': chat_id,
        'chat_name': data['chatName'],
        'model': data['model'],
        'userId': data['userId'],
    }

def handle_delete_chat(request):
    chat_id = request.get_json()['chatId']
    ChatService().delete_chat(chat_id)
    return 'Conversation deleted'

def handle_post_message(request):
    data = request.json
    save_to_db = data.get('saveToDb', True)
    create_vector_pipeline = data.get('createVectorPipeline', False)
    boss_agent = BossAgent()
    chat_service = ChatService(db_name=data['dbName'])
    user_message = data['userMessage']['content']

    if create_vector_pipeline:
        query_pipeline = boss_agent.create_vector_pipeline(user_message, data['projectId'])
        results = chat_service.query_snapshots(query_pipeline)
        print(results)
        system_message = boss_agent.prepare_vector_response(results)
        
    complete_message = ''
    response_generator = boss_agent.process_message(data['chatId'], data['chatHistory'], user_message, system_message)

    # Create a generator to handle streaming and compile the complete message
    def compile_and_stream():
        nonlocal complete_message
        for response in response_generator:
            complete_message += response['content']
            yield json.dumps(response) + '\n'

    # Stream responses to client
    response = Response(compile_and_stream(), mimetype='application/json')
    
    # save_to_db will be false if when I just want to store the chat locally
    if save_to_db:
        chat_service.create_message(data['chatId'], 'user', user_message)
        response.call_on_close(lambda: chat_service.create_message(data['chatId'], 'agent', complete_message))
    
    return response

def chat(request):
    if request.method == "OPTIONS":
        return cors_preflight_response()
    
    if not check_api_key(request):
        return {'message': 'Unauthorized'}, 401, headers

    if request.path in ('/', '/chatMobile'):
        if request.method == 'GET':
            return (handle_fetch_chats(request), 200, headers)
        if request.method == 'POST':
            return (handle_create_chat(request), 200, headers)
        if request.method == 'DELETE':
            return (handle_delete_chat(request), 200, headers)

    if request.path in ('/messages', '/chatMobile/messages'):
        if request.method == 'POST':
            return (handle_post_message(request), 200, headers)
        if request.method == 'DELETE':
            chat_id = request.json.get('chatId')
            ChatService().delete_all_messages(chat_id)
            return ('Memory Cleared', 200, headers)
    




    
    

    
