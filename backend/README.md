# CIT CREATIV Backend

## Setup Instructions

### Prerequisites
- Python 3.8+
- MongoDB (local or Atlas)

### Installation

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure MongoDB:**
   - Update `.env` with your MongoDB URI
   - Default: `mongodb://localhost:27017/cit-creativ`
   - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/cit-creativ`

6. **Start the server:**
   ```bash
   python app.py
   ```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/current-user` - Get logged-in user info
- `GET /api/auth/check-session` - Check if user is logged in

### Attendance
- `POST /api/attendance/mark` - Mark attendance with photo
- `GET /api/attendance/records` - Get user's attendance records
- `GET /api/attendance/all` - Get all attendance (admin)
- `GET /api/attendance/event-stats/<event_name>` - Event statistics

## Database Collections

### Users Collection
```json
{
  "_id": ObjectId,
  "student_id": "string",
  "email": "string",
  "password": "hashed_string",
  "name": "string",
  "role": "member|admin",
  "created_at": "datetime",
  "attendance": []
}
```

### Attendance Collection
```json
{
  "_id": ObjectId,
  "student_id": "string",
  "event_name": "string",
  "photo_filename": "string",
  "date": "datetime",
  "verified": "boolean"
}
```

## Development Notes
- Passwords are hashed using Werkzeug
- Sessions are server-side (filesystem-based)
- CORS is enabled for frontend requests
- Photos are saved to `/uploads` directory
