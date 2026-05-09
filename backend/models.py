from datetime import datetime
from bson.objectid import ObjectId

class User:
    def __init__(self, student_id, email, password, name=None, role=None):
        self.student_id = student_id
        self.email = email
        self.password = password
        self.name = name or student_id
        self.role = role or 'member'
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.attendance = []
    
    def to_dict(self):
        return {
            'student_id': self.student_id,
            'email': self.email,
            'password': self.password,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'attendance': self.attendance
        }
    
    def to_dict_safe(self):
        """Return user data without password"""
        return {
            'student_id': self.student_id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class Attendance:
    def __init__(self, student_id, event_name, photo_filename=None):
        self.student_id = student_id
        self.event_name = event_name
        self.photo_filename = photo_filename
        self.date = datetime.utcnow()
        self.verified = False
    
    def to_dict(self):
        return {
            'student_id': self.student_id,
            'event_name': self.event_name,
            'photo_filename': self.photo_filename,
            'date': self.date,
            'verified': self.verified
        }
