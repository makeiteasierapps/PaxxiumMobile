import os
from dotenv import load_dotenv
from flask import jsonify

load_dotenv()

if os.getenv('LOCAL_DEV') == 'True':
    from .MomentService import MomentService
    from .BossAgent import BossAgent
else:
    from MomentService import MomentService
    from BossAgent import BossAgent

headers = {"Access-Control-Allow-Origin": "*"}
def cors_preflight_response():
    return ("", 204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE, PUT, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Project-ID",
        "Access-Control-Max-Age": "3600",
    })

def handle_fetch_moments():
    # Get all moments from the database
    moment_service = MomentService()
    return moment_service.get_all_moments()
    

def handle_add_moment(request):
    """
    This function handles the addition of a new moment.
    """
    moment_service = MomentService()
    boss_agent = BossAgent()
    new_moment = request.json['newMoment']
    new_moment = {**new_moment, **boss_agent.extract_content(new_moment)}

    # Add the moment to the database
    new_moment = moment_service.add_moment(new_moment)
    # Prepare snapshot for embeddings
    combined_content = f"Transcript: {new_moment['transcript']}\nAction Items:\n" + "\n".join(new_moment['actionItems']) + f"\nSummary: {new_moment['summary']}"
    snapshot_data = new_moment.copy()
    # Create and add embeddings to the snapshot
    snapshot_data['embeddings'] = boss_agent.embed_content(combined_content)
    # Add the snapshot to the database
    moment_service.create_snapshot(snapshot_data)
    
    return new_moment

def handle_update_moment(request):
    boss_agent = BossAgent()
    moment_service = MomentService()
    current_moment = request.json['moment']
    moment_id = current_moment['momentId']
    current_snapshot = {**current_moment, **boss_agent.extract_content(current_moment)}
    current_snapshot['momentId'] = moment_id
    previous_snapshot = moment_service.get_previous_snapshot(moment_id)

    # Combine and embed the current snapshot
    combined_content = f"Transcript: {current_moment['transcript']}\nAction Items:\n" + "\n".join(current_snapshot['actionItems']) + f"\nSummary: {current_snapshot['summary']}"
    current_snapshot['embeddings'] = boss_agent.embed_content(combined_content)
    
    # Create snapshot in the db
    moment_service.create_snapshot(current_snapshot)

    # diff the current snapshot with the previous snapshot
    new_snapshot = boss_agent.diff_snapshots(previous_snapshot, current_snapshot)
    new_snapshot.update({
        'momentId': moment_id,
        'date': current_moment['date'],
        'transcript': current_moment['transcript']
    })

    new_snapshot['transcript'] = moment_service.update_moment(new_snapshot)
    
    return new_snapshot

def handle_delete_moment(request):
    moment_service = MomentService()
    moment_id = request.json['id']
    moment_service.delete_moment(moment_id)
    return 'Moment Deleted'

def moments(request):
    if request.method == "OPTIONS":
        return cors_preflight_response()

    if request.path in ('/', '/moments'):
        if request.method == 'GET':
            return jsonify({'moments': handle_fetch_moments()}), 200, headers
        if request.method == 'POST':
            return jsonify({'moment': handle_add_moment(request)}), 200, headers
        if request.method == 'PUT':
            return jsonify({'moment': handle_update_moment(request)}), 200, headers
        if request.method == 'DELETE':
            handle_delete_moment(request)
            return ('Delete Moment', 200, headers)