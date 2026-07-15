from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user
from app.agents.conversation_agent import handle_chat_conversation
from app.agents import profile_agent
from typing import List

router = APIRouter(prefix="/api/chat", tags=["Consultant Chat"])

@router.get("/sessions", response_model=List[schemas.ChatSessionListResponse])
def get_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns all sessions sorted by last updated
    return db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id
    ).order_by(models.ChatSession.updated_at.desc()).all()

@router.get("/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageResponse])
def get_session_messages(session_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify session belongs to user
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.timestamp.asc()).all()

@router.post("/message")
def post_chat_message(
    payload: schemas.ChatMessageCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Orchestrate chat using Conversation Agent
        res = handle_chat_conversation(
            user_message=payload.text,
            session_id=payload.session_id,
            user=current_user,
            db=db
        )
        
        # Enrich profile in parallel (background task)
        background_tasks.add_task(
            profile_agent.enrich_profile_from_chat,
            user_id=current_user.id,
            user_message=payload.text,
            ai_reply=res["reply"]
        )
        
        return res
    except Exception as e:
        print(f"[Chat API] Error processing message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing chat message. Please try again."
        )


