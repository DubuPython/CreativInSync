from flask import Blueprint, request, session, jsonify, current_app
from models import Attendance
import os
from datetime import datetime
from werkzeug.utils import secure_filename

attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')

ALLOWED_EXT = {'png', 'jpg', 'jpeg'}

def get_db():
	db = current_app.extensions.get('pymongo')
	if not db:
		return None
	return db.db

def allowed_file(filename):
	return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT

# Ensure uploads folder exists at runtime
def ensure_upload_folder():
	upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
	path = os.path.join(current_app.root_path, upload_folder)
	if not os.path.exists(path):
		os.makedirs(path, exist_ok=True)
	return path

@attendance_bp.route('/mark', methods=['POST'])
def mark_attendance():
	"""Mark attendance for an event with photo verification"""
	student_id = session.get('student_id')

	if not student_id:
		return jsonify({'error': 'Not logged in'}), 401

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# Check if user exists
	user = db.users.find_one({'student_id': student_id})
	if not user:
		return jsonify({'error': 'User not found'}), 404

	# Get form data
	event_name = (request.form.get('event_name') or '').strip()
	photo = request.files.get('photo')

	if not event_name:
		return jsonify({'error': 'Event name required'}), 400

	if not photo or not photo.filename:
		return jsonify({'error': 'Photo required for verification'}), 400

	if not allowed_file(photo.filename):
		return jsonify({'error': 'Unsupported file type'}), 400

	# Save photo safely
	upload_dir = ensure_upload_folder()
	clean_event = secure_filename(event_name) or 'event'
	ext = secure_filename(photo.filename).rsplit('.', 1)[1].lower()
	filename = f"{secure_filename(student_id)}_{clean_event}_{int(datetime.utcnow().timestamp())}.{ext}"
	photo_path = os.path.join(upload_dir, filename)
	photo.save(photo_path)

	# Create attendance record
	attendance_record = {
		'student_id': student_id,
		'event_name': event_name,
		'photo_filename': filename,
		'date': datetime.utcnow(),
		'verified': False
	}

	# Add to database
	result = db.attendance.insert_one(attendance_record)

	# Also add to user's attendance array (store minimal fields)
	db.users.update_one(
		{'student_id': student_id},
		{'$push': {'attendance': {
			'event_name': attendance_record['event_name'],
			'photo_filename': attendance_record['photo_filename'],
			'date': attendance_record['date'],
			'verified': attendance_record['verified']
		}}}
	)

	return jsonify({
		'message': 'Attendance marked successfully',
		'event_name': event_name,
		'date': attendance_record['date'].isoformat()
	}), 201


@attendance_bp.route('/records', methods=['GET'])
def get_attendance_records():
	"""Get attendance records for current user"""
	student_id = session.get('student_id')

	if not student_id:
		return jsonify({'error': 'Not logged in'}), 401

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# Get user
	user = db.users.find_one({'student_id': student_id})
	if not user:
		return jsonify({'error': 'User not found'}), 404

	# Format attendance records for response
	attendance_records = []
	for record in user.get('attendance', []):
		attendance_records.append({
			'event_name': record.get('event_name'),
			'date': record.get('date').isoformat() if hasattr(record.get('date'), 'isoformat') else record.get('date'),
			'photo_filename': record.get('photo_filename'),
			'verified': record.get('verified', False)
		})

	return jsonify({
		'student_id': student_id,
		'total_events': len(attendance_records),
		'attendance': attendance_records
	}), 200


@attendance_bp.route('/all', methods=['GET'])
def get_all_attendance():
	"""Get all attendance records (admin view)"""
	student_id = session.get('student_id')

	if not student_id:
		return jsonify({'error': 'Not logged in'}), 401

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# Check if user is admin (role-based)
	user = db.users.find_one({'student_id': student_id})
	if not user or user.get('role') != 'admin':
		return jsonify({'error': 'Unauthorized'}), 403

	# Get all attendance records
	all_records = list(db.attendance.find({}, {'_id': 0}))

	# Format records
	formatted_records = []
	for record in all_records:
		formatted_records.append({
			'student_id': record.get('student_id'),
			'event_name': record.get('event_name'),
			'date': record.get('date').isoformat() if hasattr(record.get('date'), 'isoformat') else record.get('date'),
			'photo_filename': record.get('photo_filename'),
			'verified': record.get('verified', False)
		})

	return jsonify({
		'total_records': len(formatted_records),
		'attendance': formatted_records
	}), 200


@attendance_bp.route('/event-stats/<event_name>', methods=['GET'])
def get_event_stats(event_name):
	"""Get attendance stats for a specific event"""
	student_id = session.get('student_id')

	if not student_id:
		return jsonify({'error': 'Not logged in'}), 401

	db = get_db()
	if db is None:
		return jsonify({'error': 'Database not available'}), 500

	# Count attendance for this event
	count = db.attendance.count_documents({'event_name': event_name})

	# Get list of attendees
	attendees = list(db.attendance.find(
		{'event_name': event_name},
		{'student_id': 1, 'date': 1, '_id': 0}
	))

	formatted_attendees = []
	for attendee in attendees:
		formatted_attendees.append({
			'student_id': attendee.get('student_id'),
			'date': attendee.get('date').isoformat() if hasattr(attendee.get('date'), 'isoformat') else attendee.get('date')
		})

	return jsonify({
		'event_name': event_name,
		'total_attendees': count,
		'attendees': formatted_attendees
	}), 200
