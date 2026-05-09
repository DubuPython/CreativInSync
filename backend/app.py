from dotenv import load_dotenv # Add this
load_dotenv()                # Add this
from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_session import Session
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)
Session(app)
app.config.update(
    SESSION_COOKIE_SAMESITE='Lax', 
    SESSION_COOKIE_SECURE=False, 
    SESSION_COOKIE_HTTPONLY=True
)

print(f"DEBUG: Connecting to Database at: {app.config['MONGO_URI']}")

# Security / upload limits set via config
app.config['MAX_CONTENT_LENGTH'] = app.config.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024)

# Initialize MongoDB (PyMongo)
mongo = PyMongo(app)

# Configure CORS - restrict to configured origins for /api/*
origins = [o.strip() for o in app.config.get('FRONTEND_ORIGINS', '').split(',') if o.strip()]
if not origins:
      origins = ["http://localhost:5500"]
CORS(
    app,
    resources={r"/api/*": {"origins": origins}},
    supports_credentials=True
)

# Import and register blueprints
from routes.auth import auth_bp
from routes.attendance import attendance_bp
from routes.admin import admin_bp

app.register_blueprint(auth_bp)
app.register_blueprint(attendance_bp)
app.register_blueprint(admin_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    return {'status': 'Backend is running'}, 200

if __name__ == '__main__':
    app.run(
        host=app.config['HOST'],
        port=app.config['PORT'],
        debug=app.config['DEBUG']
    )
