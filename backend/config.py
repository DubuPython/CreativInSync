import os
from dotenv import load_dotenv
from datetime import timedelta

# Ensure .env is loaded before the Config class is defined
load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    
    # MongoDB Config: Uses .env value or falls back to local if .env is missing
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/cit-creativ')

    # Session & Cookie security
    SESSION_TYPE = 'filesystem'
    SESSION_COOKIE_SAMESITE = 'None'  # Required for cross-port communication
    SESSION_COOKIE_SECURE = False    # Must be False for local http (not https)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() in ('1', 'true', 'yes')

    # File uploads
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 5 * 1024 * 1024))

    # Server Config
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('1', 'true', 'yes')
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', '5000'))

    # IMPORTANT: Changed default to 5500 to match your Live Server
    FRONTEND_ORIGINS = os.getenv('FRONTEND_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500')