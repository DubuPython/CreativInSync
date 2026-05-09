#!/usr/bin/env python3
"""Create or update an admin user in the MongoDB used by the backend.

Usage:
  python create_admin.py <student_id> <email> <password> [name]

Example:
  python create_admin.py admin admin@example.com S3cretP@ss Admin
"""
import sys
import os
from datetime import datetime
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/cit-creativ')

def get_db():
    client = MongoClient(MONGO_URI)
    # client.get_default_database() requires URI with /dbname; fallback to cit-creativ
    db = None
    try:
        db = client.get_default_database()
    except Exception:
        db = client['cit-creativ']
    return db

def create_admin(student_id, email, password, name='Admin'):
    db = get_db()
    users = db.users
    existing = users.find_one({'student_id': student_id})
    hashed = generate_password_hash(password)
    now = datetime.utcnow()
    doc = {
        'student_id': student_id,
        'email': email,
        'password': hashed,
        'name': name,
        'role': 'admin',
        'created_at': now,
        'attendance': []
    }
    if existing:
        users.update_one({'student_id': student_id}, {'$set': doc})
        print(f"Updated existing user '{student_id}' to admin.")
    else:
        users.insert_one(doc)
        print(f"Created admin user '{student_id}'.")

def main(argv):
    if len(argv) < 4:
        print('Usage: python create_admin.py <student_id> <email> <password> [name]')
        return 1
    student_id = argv[1]
    email = argv[2]
    password = argv[3]
    name = argv[4] if len(argv) > 4 else 'Admin'
    create_admin(student_id, email, password, name)
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))
