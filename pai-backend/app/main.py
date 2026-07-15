import json
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app import models
from app.utils.auth import get_current_user
from app.routers import auth, profile, documents, chat, tracker, roadmap
from app.agents.retention_agents import generate_notifications

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Placement AI API", description="AI Operating System for International Students")

import os

# Configure CORS
cors_origins_str = os.getenv("CORS_ORIGINS")
if cors_origins_str:
    origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
else:
    origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(tracker.router)
app.include_router(roadmap.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Placement AI API Server!"}

@app.get("/api/dashboard/summary")
def get_dashboard_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate Profile Completion
    # Check fields in user profile
    fields_to_check = [
        current_user.full_name,
        current_user.phone,
        current_user.dob,
        current_user.gender,
        current_user.nationality,
        current_user.country,
        current_user.city,
        current_user.linkedin,
        current_user.current_education,
        current_user.current_status,
        current_user.summary
    ]
    
    filled = sum(1 for f in fields_to_check if f and str(f).strip() != "")
    total = len(fields_to_check)
    
    # Add skills checklist
    skills_list = []
    try:
        if current_user.skills:
            skills_list = json.loads(current_user.skills)
    except:
        pass
    if skills_list:
        filled += 1
    total += 1
    
    # Add experience checklist
    if current_user.education:
        filled += 1
    total += 1
    if current_user.work_experience:
        filled += 1
    total += 1
    
    completion_percentage = int((filled / total) * 100)
    
    # Get statistics
    saved_unis_count = db.query(models.TrackedUniversity).filter(
        models.TrackedUniversity.user_id == current_user.id
    ).count()
    
    uploaded_docs_count = db.query(models.Document).filter(
        models.Document.user_id == current_user.id
    ).count()
    
    # Get recent chat sessions
    recent_sessions = db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id
    ).order_by(models.ChatSession.updated_at.desc()).limit(3).all()
    
    recent_chats = [
        {"id": s.id, "title": s.title, "time": s.updated_at.strftime("%I:%M %p")}
        for s in recent_sessions
    ]
    
    # Generate dynamic alerts/notifications using Alerts Agent
    notifications = generate_notifications(current_user, db)
    
    return {
        "completion_percentage": completion_percentage,
        "saved_unis_count": saved_unis_count,
        "uploaded_docs_count": uploaded_docs_count,
        "recent_chats": recent_chats,
        "recent_activity": notifications
    }
