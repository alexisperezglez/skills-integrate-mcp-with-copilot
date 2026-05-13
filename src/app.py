"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.sessions import SessionMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
import json
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Add session middleware
app.add_middleware(SessionMiddleware, secret_key="your-secret-key-change-in-production")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load activities from JSON file
def load_activities():
    activities_file = Path(__file__).parent / "activities.json"
    with open(activities_file, "r") as f:
        return json.load(f)

# Load teachers from JSON file
def load_teachers():
    teachers_file = Path(__file__).parent / "teachers.json"
    with open(teachers_file, "r") as f:
        return json.load(f)

activities = load_activities()
teachers = load_teachers()


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/auth/login")
def login(username: str, password: str):
    """Login as a teacher"""
    # Check if username/password combination is valid
    for teacher in teachers["teachers"]:
        if teacher["username"] == username and teacher["password"] == password:
            return {"message": "Login successful", "username": username}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/auth/logout")
def logout():
    """Logout"""
    return {"message": "Logout successful"}


@app.get("/auth/check")
def check_auth():
    """Check if currently authenticated as teacher"""
    # This will be set by the frontend via session
    return {"authenticated": False}


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, teacher_username: str = None):
    """Sign up a student for an activity (teachers only)"""
    # Verify teacher is authenticated
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required. Only teachers can register students.")
    
    # Verify teacher exists
    teacher_exists = any(t["username"] == teacher_username for t in teachers["teachers"])
    if not teacher_exists:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, teacher_username: str = None):
    """Unregister a student from an activity (teachers only)"""
    # Verify teacher is authenticated
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required. Only teachers can unregister students.")
    
    # Verify teacher exists
    teacher_exists = any(t["username"] == teacher_username for t in teachers["teachers"])
    if not teacher_exists:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
