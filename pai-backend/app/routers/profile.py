import json
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user
from app.utils.cv_generator import generate_docx_resume, generate_pdf_resume

router = APIRouter(prefix="/api/profile", tags=["Profile Management"])

@router.put("", response_model=schemas.UserResponse)
def update_profile(profile_in: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    update_data = profile_in.model_dump(exclude_unset=True)
    
    # Special handling for skills lists
    if "skills" in update_data and update_data["skills"] is not None:
        current_user.skills = json.dumps(update_data["skills"])
        del update_data["skills"]
        
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user

# Education Endpoints
@router.post("/education", response_model=schemas.EducationResponse)
def add_education(edu_in: schemas.EducationCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_edu = models.Education(
        user_id=current_user.id,
        degree=edu_in.degree,
        school=edu_in.school,
        period=edu_in.period,
        gpa=edu_in.gpa,
        details=edu_in.details
    )
    db.add(new_edu)
    db.commit()
    db.refresh(new_edu)
    return new_edu

@router.delete("/education/{edu_id}")
def delete_education(edu_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    edu = db.query(models.Education).filter(models.Education.id == edu_id, models.Education.user_id == current_user.id).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education record not found")
    db.delete(edu)
    db.commit()
    return {"detail": "Education record deleted"}

# Experience Endpoints
@router.post("/experience", response_model=schemas.WorkExperienceResponse)
def add_experience(exp_in: schemas.WorkExperienceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_exp = models.WorkExperience(
        user_id=current_user.id,
        role=exp_in.role,
        company=exp_in.company,
        period=exp_in.period,
        description=exp_in.description
    )
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)
    return new_exp

@router.delete("/experience/{exp_id}")
def delete_experience(exp_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(models.WorkExperience).filter(models.WorkExperience.id == exp_id, models.WorkExperience.user_id == current_user.id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found")
    db.delete(exp)
    db.commit()
    return {"detail": "Experience record deleted"}

# Project Endpoints
@router.post("/project", response_model=schemas.ProjectResponse)
def add_project(proj_in: schemas.ProjectCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_proj = models.Project(
        user_id=current_user.id,
        name=proj_in.name,
        description=proj_in.description
    )
    db.add(new_proj)
    db.commit()
    db.refresh(new_proj)
    return new_proj

@router.delete("/project/{proj_id}")
def delete_project(proj_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    proj = db.query(models.Project).filter(models.Project.id == proj_id, models.Project.user_id == current_user.id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project record not found")
    db.delete(proj)
    db.commit()
    return {"detail": "Project record deleted"}

# CV Export Endpoints
@router.get("/export")
def export_cv(
    template: str = Query("ats", description="Templates: europass, ats, modern, academic"),
    format: str = Query("docx", description="Formats: docx, pdf, json"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if format == "json":
        # Return raw profile details in JSON response
        skills_list = []
        try:
            if current_user.skills:
                skills_list = json.loads(current_user.skills)
        except:
            pass
            
        profile_json = {
            "name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "dob": current_user.dob,
            "gender": current_user.gender,
            "nationality": current_user.nationality,
            "country": current_user.country,
            "city": current_user.city,
            "linkedin": current_user.linkedin,
            "summary": current_user.summary,
            "skills": skills_list,
            "education": [{"degree": e.degree, "school": e.school, "period": e.period, "gpa": e.gpa, "details": e.details} for e in current_user.education],
            "work_experience": [{"role": w.role, "company": w.company, "period": w.period, "description": w.description} for w in current_user.work_experience],
            "projects": [{"name": p.name, "description": p.description} for p in current_user.projects]
        }
        
        # Return as JSON file attachment
        json_str = json.dumps(profile_json, indent=2)
        io_stream = io.BytesIO(json_str.encode('utf-8'))
        return StreamingResponse(
            io_stream,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=placement_ai_profile_{current_user.id}.json"}
        )
        
    elif format == "docx":
        # Generate DOCX
        docx_stream = generate_docx_resume(current_user, template)
        filename = f"placement_ai_resume_{template}.docx"
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    elif format == "pdf":
        # Generate PDF
        pdf_stream = generate_pdf_resume(current_user, template)
        filename = f"placement_ai_resume_{template}.pdf"
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    else:
        raise HTTPException(status_code=400, detail="Invalid format specified. Must be json, docx, or pdf.")
