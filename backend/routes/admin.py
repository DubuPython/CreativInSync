from flask import Blueprint, request, jsonify, session
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def get_db():
    # This local import ensures 'mongo' is ready when the function is called
    from app import mongo
    return mongo.db

def is_admin():
    student_id = session.get('student_id')
    if not student_id:
        return False
        
    db = get_db()
    user = db.users.find_one({'student_id': student_id})
    
    if user:
        # Use .strip() to remove hidden spaces and .lower() for case safety
        db_role = str(user.get('role', '')).strip().lower()
        return db_role == 'admin'
        
    return False

@admin_bp.route('/data', methods=['GET'])
def get_site_data():
    """Get all site configuration data"""
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403

    db = get_db()
    if db is None:
        return jsonify({'error': 'Database not available'}), 500

    # Fetch all data from collections including about and perks
    hero = db.site_config.find_one({'type': 'hero'}) or {'type': 'hero', 'title': '', 'subtitle': '', 'logo': ''}
    about = db.site_config.find_one({'type': 'about'}) or {'type': 'about', 'description': ''}
    social = db.site_config.find_one({'type': 'social'}) or {'type': 'social', 'facebook': '#'}
    
    counters = list(db.counters.find({}, {'_id': 0})) or [{'target': 150}, {'target': 20}]
    events = list(db.events.find({}, {'_id': 0}))
    achievements = list(db.achievements.find({}, {'_id': 0}))
    team = list(db.team.find({}, {'_id': 0}))
    advisers = list(db.advisers.find({}, {'_id': 0}))
    perks = list(db.perks.find({}, {'_id': 0})) # ADDED PERKS

    # Clean up _id field if present
    hero.pop('_id', None)
    about.pop('_id', None)
    social.pop('_id', None)

    data = {
        'hero': hero,
        'about': about, # ADDED ABOUT
        'counters': counters,
        'events': events,
        'achievements': achievements,
        'team': team,
        'advisers': advisers,
        'perks': perks, # ADDED PERKS
        'social': social
    }

    return jsonify(data), 200

@admin_bp.route('/data', methods=['POST'])
def update_site_data():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    db = get_db()
    
    try:
        # Loop includes perks naturally now
        for key in ['counters', 'events', 'achievements', 'team', 'advisers', 'perks']:
            if key in data and isinstance(data[key], list):
                clean_list = [ {k: v for k, v in item.items() if k != '_id'} for item in data[key] if isinstance(item, dict) ]
                db[key].delete_many({})
                if clean_list:
                    db[key].insert_many(clean_list)

        # Update Hero Config
        if 'hero' in data:
            hero_data = {k: v for k, v in data['hero'].items() if k != '_id'}
            db.site_config.update_one({'type': 'hero'}, {'$set': hero_data}, upsert=True)
            
        # Update About Config
        if 'about' in data:
            about_data = {k: v for k, v in data['about'].items() if k != '_id'}
            db.site_config.update_one({'type': 'about'}, {'$set': about_data}, upsert=True)
            
        # Update Social Config
        if 'social' in data:
            social_data = {k: v for k, v in data['social'].items() if k != '_id'}
            db.site_config.update_one({'type': 'social'}, {'$set': social_data}, upsert=True)

        return jsonify({'message': 'Success'}), 200
    except Exception as e:
        print(f"CRITICAL SAVE ERROR: {e}")
        return jsonify({'error': str(e)}), 500
    
@admin_bp.route('/validate', methods=['POST'])
def validate_data():
    """Validate JSON data structure without saving"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        # Basic structure validation
        required_keys = ['hero', 'counters', 'events', 'achievements', 'team', 'advisers', 'social']
        missing = [k for k in required_keys if k not in data]

        if missing:
            return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

        # Type checks
        if not isinstance(data.get('counters'), list):
            return jsonify({'error': 'counters must be an array'}), 400
        if not isinstance(data.get('events'), list):
            return jsonify({'error': 'events must be an array'}), 400
        if not isinstance(data.get('achievements'), list):
            return jsonify({'error': 'achievements must be an array'}), 400
        if not isinstance(data.get('team'), list):
            return jsonify({'error': 'team must be an array'}), 400
        if not isinstance(data.get('advisers'), list):
            return jsonify({'error': 'advisers must be an array'}), 400

        return jsonify({'message': 'Data structure is valid', 'valid': True}), 200

    except Exception as e:
        return jsonify({'error': f'Validation failed: {str(e)}'}), 400
