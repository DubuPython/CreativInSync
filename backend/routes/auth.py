from flask import Blueprint, request, session, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models import User
import re
import time

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# simple helpers
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 8
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_SECONDS = 10 * 60  # 10 minutes

def get_db():
    from app import mongo
    # 1. Try the automatic database detection
    if mongo.db is not None:
        return mongo.db
    
    # 2. Fallback: Manually select it from the client (cx)
    if mongo.cx is not None:
        return mongo.cx['cit-creativ']
    
    # 3. Last resort: If the connection hasn't started at all
    return None

@auth_bp.route('/signup', methods=['POST'])
def signup():
	"""Create a new user account"""
	data = request.get_json()

	# Validate input
	if not data or not data.get('student_id') or not data.get('password') or not data.get('email'):
		return jsonify({'error': 'Missing required fields'}), 400

	student_id = data.get('student_id').strip()
	email = data.get('email').strip()
	password = data.get('password')
	confirm_password = data.get('confirm_password')

	# Basic validation
	if not student_id.isalnum() or len(student_id) < 3:
		return jsonify({'error': 'Invalid student ID'}), 400

	if not EMAIL_RE.match(email):
		return jsonify({'error': 'Invalid email address'}), 400

	if len(password) < MIN_PASSWORD_LEN:
		return jsonify({'error': f'Password must be at least {MIN_PASSWORD_LEN} characters'}), 400

	if password != confirm_password:
		return jsonify({'error': 'Passwords do not match'}), 400

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# Check if student ID already exists
	existing_user = db.users.find_one({'student_id': student_id})
	if existing_user:
		# do not leak too much info
		return jsonify({'error': 'Student ID already registered'}), 409

	# Hash password
	hashed_password = generate_password_hash(password)

	# Create new user using model timestamps
	user_obj = User(student_id, email, hashed_password)
	user = user_obj.to_dict()
	# ensure password is hashed in dict
	user['password'] = hashed_password

	result = db.users.insert_one(user)

	# Set session
	session['student_id'] = student_id
	session.permanent = True

	return jsonify({
		'message': 'Account created successfully',
		'student_id': student_id
	}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
	
	"""Login user with student ID and password"""
	data = request.get_json()

	if not data or not data.get('student_id') or not data.get('password'):
		return jsonify({'error': 'Missing student ID or password'}), 400

	student_id = data.get('student_id').strip()
	password = data.get('password')

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# login throttling stored in session (simple protection)
	now = int(time.time())
	attempts = session.get('login_attempts', {})
	record = attempts.get(student_id, {'count': 0, 'first': now, 'locked_until': 0})
	# check lockout
	if record.get('locked_until', 0) > now:
		return jsonify({'error': 'Too many attempts. Try later.'}), 429

	user = db.users.find_one({'student_id': student_id})
	# do not reveal whether user exists
	if not user or not check_password_hash(user.get('password', ''), password):
		# update attempts
		record['count'] = record.get('count', 0) + 1
		if record['count'] >= MAX_LOGIN_ATTEMPTS:
			record['locked_until'] = now + LOCKOUT_SECONDS
		attempts[student_id] = record
		session['login_attempts'] = attempts
		return jsonify({'error': 'Invalid student ID or password'}), 401

	# reset attempts on success
	if student_id in attempts:
		attempts.pop(student_id, None)
		session['login_attempts'] = attempts

	# Set session
	session['student_id'] = student_id
	session.permanent = True

	return jsonify({
		'message': 'Login successful',
		'student_id': student_id,
		'email': user.get('email'),
		'name': user.get('name', student_id)
	}), 200
	


@auth_bp.route('/logout', methods=['POST'])
def logout():
	"""Logout user"""
	session.clear()
	return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/current-user', methods=['GET'])
def current_user():
	"""Get currently logged-in user info"""
	student_id = session.get('student_id')

	if not student_id:
		return jsonify({'error': 'Not logged in'}), 401

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	user = db.users.find_one({'student_id': student_id})
	if not user:
		return jsonify({'error': 'User not found'}), 404

	# Don't send password
	user_data = {
		'student_id': user['student_id'],
		'email': user['email'],
		'name': user.get('name', student_id),
		'role': user.get('role', 'member')
	}

	return jsonify(user_data), 200


@auth_bp.route('/check-session', methods=['GET'])
def check_session():
	"""Check if user has active session"""
	student_id = session.get('student_id')

	if student_id:
		db = get_db()
		if db:
			user = db.users.find_one({'student_id': student_id})
			if user:
				return jsonify({
					'logged_in': True,
					'student_id': student_id,
					'name': user.get('name', student_id)
				}), 200

	return jsonify({'logged_in': False}), 200

