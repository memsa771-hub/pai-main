from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user
from typing import List, Dict

router = APIRouter(prefix="/api/roadmap", tags=["Student Roadmap"])

class StepToggleRequest(BaseModel):
    university: str
    section_index: int
    step_id: str

@router.get("", response_model=List[schemas.UniversityRoadmapResponse])
def get_roadmaps(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all roadmap sections for user
    sections = db.query(models.RoadmapSection).filter(
        models.RoadmapSection.user_id == current_user.id
    ).order_by(models.RoadmapSection.university, models.RoadmapSection.number.asc()).all()
    
    # Group by university
    roadmaps_dict = {}
    for sec in sections:
        uni = sec.university
        if uni not in roadmaps_dict:
            roadmaps_dict[uni] = {
                "university": uni,
                "degree": sec.degree,
                "term": sec.term,
                "progress": sec.progress,
                "sections": []
            }
        
        # Sort steps by id
        steps_sorted = sorted(sec.steps, key=lambda s: s.id)
        
        roadmaps_dict[uni]["sections"].append({
            "number": sec.number,
            "title": sec.title,
            "steps": [
                {
                    "id": step.id,
                    "title": step.title,
                    "description": step.description,
                    "status": step.status,
                    "priority": step.priority,
                    "type": step.type
                }
                for step in steps_sorted
            ]
        })
        
    return list(roadmaps_dict.values())

@router.post("/step/toggle")
def toggle_step(
    payload: StepToggleRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find active section
    section = db.query(models.RoadmapSection).filter(
        models.RoadmapSection.user_id == current_user.id,
        models.RoadmapSection.university == payload.university,
        models.RoadmapSection.number == payload.section_index + 1
    ).first()
    
    if not section:
        raise HTTPException(status_code=404, detail="Roadmap section not found")
        
    # Find the target step
    step = db.query(models.RoadmapStep).filter(
        models.RoadmapStep.section_id == section.id,
        models.RoadmapStep.id == payload.step_id
    ).first()
    
    if not step:
        raise HTTPException(status_code=404, detail="Roadmap step not found")
        
    # State transitions: not_started -> started -> completed
    if step.status == "not_started":
        step.status = "started"
        db.commit()
    elif step.status == "started":
        step.status = "completed"
        db.commit()
        
        # Try to unlock next step
        # Get sorted list of steps in this section
        all_steps = db.query(models.RoadmapStep).filter(models.RoadmapStep.section_id == section.id).order_by(models.RoadmapStep.id.asc()).all()
        step_idx = next((i for i, s in enumerate(all_steps) if s.id == step.id), -1)
        
        if step_idx >= 0 and step_idx + 1 < len(all_steps):
            next_step = all_steps[step_idx + 1]
            if next_step.status == "locked":
                next_step.status = "not_started"
                db.commit()
        else:
            # Unlock first step of next section
            next_section = db.query(models.RoadmapSection).filter(
                models.RoadmapSection.user_id == current_user.id,
                models.RoadmapSection.university == payload.university,
                models.RoadmapSection.number == section.number + 1
            ).first()
            if next_section:
                next_sec_steps = db.query(models.RoadmapStep).filter(models.RoadmapStep.section_id == next_section.id).order_by(models.RoadmapStep.id.asc()).all()
                if next_sec_steps and next_sec_steps[0].status == "locked":
                    next_sec_steps[0].status = "not_started"
                    db.commit()
                    
    # Recalculate progress across all sections of this university
    all_sections = db.query(models.RoadmapSection).filter(
        models.RoadmapSection.user_id == current_user.id,
        models.RoadmapSection.university == payload.university
    ).all()
    
    total_steps = 0
    completed_steps = 0
    
    for sec in all_sections:
        for st in sec.steps:
            total_steps += 1
            if st.status == "completed":
                completed_steps += 1
                
    progress = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0
    
    # Update progress in all section entries of this university
    for sec in all_sections:
        sec.progress = progress
    db.commit()
    
    # Return updated roadmap details for this university
    return {"status": "success", "progress": progress}
