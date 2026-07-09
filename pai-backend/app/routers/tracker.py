import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user
from app.agents.research_agent import research_university
from typing import List

router = APIRouter(prefix="/api/tracker/universities", tags=["University Tracker"])

@router.get("", response_model=List[schemas.TrackedUniversityResponse])
def get_tracked_universities(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.TrackedUniversity).filter(models.TrackedUniversity.user_id == current_user.id).all()

@router.post("", response_model=schemas.TrackedUniversityResponse)
def add_tracked_university(
    payload: schemas.TrackedUniversityCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if duplicate exists
    dup = db.query(models.TrackedUniversity).filter(
        models.TrackedUniversity.user_id == current_user.id,
        models.TrackedUniversity.name == payload.name
    ).first()
    
    if dup:
        dup.status = payload.status
        db.commit()
        db.refresh(dup)
        return dup

    # Execute Research Agent to populate real requirements, deadlines, tuition!
    try:
        program_goal = current_user.preferred_field or "Graduate Study"
        extracted_details = research_university(payload.name, program_goal, current_user, db)
        
        new_uni = models.TrackedUniversity(
            user_id=current_user.id,
            name=extracted_details["name"],
            location=extracted_details["location"],
            avg_gpa=extracted_details["avg_gpa"],
            avg_gre=extracted_details["avg_gre"],
            deadlines=extracted_details["deadlines"],
            status=payload.status,
            acceptance_rate=extracted_details["acceptance_rate"],
            reqs=json.dumps(extracted_details["scholarships"]) # store scholarships / reqs here
        )
    except Exception as e:
        print(f"[Tracker API] Research agent failed during tracking: {e}")
        # Default placeholder if research fails
        new_uni = models.TrackedUniversity(
            user_id=current_user.id,
            name=payload.name,
            location=payload.location or "Global Campus",
            avg_gpa=payload.avg_gpa or "3.5/4.0",
            avg_gre=payload.avg_gre or "315/340",
            deadlines=payload.deadlines or "Rolling",
            status=payload.status,
            acceptance_rate=payload.acceptance_rate or "15%",
            reqs="[]"
        )

    db.add(new_uni)
    db.commit()
    db.refresh(new_uni)
    return new_uni

@router.delete("/{uni_id}")
def delete_tracked_university(uni_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    uni = db.query(models.TrackedUniversity).filter(
        models.TrackedUniversity.id == uni_id,
        models.TrackedUniversity.user_id == current_user.id
    ).first()
    
    if not uni:
        raise HTTPException(status_code=404, detail="Tracked university not found")
        
    db.delete(uni)
    db.commit()
    return {"detail": "University track removed"}
