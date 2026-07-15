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

    # Special handling for languages lists
    if "languages" in update_data and update_data["languages"] is not None:
        current_user.languages = json.dumps(update_data["languages"])
        del update_data["languages"]

    # Special handling for goals lists
    if "goals" in update_data and update_data["goals"] is not None:
        current_user.goals = json.dumps(update_data["goals"])
        del update_data["goals"]
        
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
        major=edu_in.major,
        period=edu_in.period,
        graduation_year=edu_in.graduation_year,
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
    achievements_json = json.dumps(exp_in.achievements) if exp_in.achievements else "[]"
    new_exp = models.WorkExperience(
        user_id=current_user.id,
        role=exp_in.role,
        company=exp_in.company,
        period=exp_in.period,
        start_date=exp_in.start_date,
        end_date=exp_in.end_date,
        description=exp_in.description,
        achievements=achievements_json
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
        description=proj_in.description,
        link_or_credential=proj_in.link_or_credential
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
        # Return premium cv_profile JSON structure
        skills_list = []
        try:
            if current_user.skills:
                skills_list = json.loads(current_user.skills)
        except:
            pass
        
        languages_list = []
        try:
            if current_user.languages:
                languages_list = json.loads(current_user.languages)
        except:
            pass

        location = ", ".join(filter(None, [current_user.city, current_user.country]))

        education_list = []
        for e in current_user.education:
            education_list.append({
                "institution": e.school,
                "degree": e.degree,
                "major": e.major or None,
                "graduation_year": e.graduation_year or e.period or None,
                "gpa_or_grades": e.gpa or None
            })

        experience_list = []
        for w in current_user.work_experience:
            achievements = []
            try:
                if w.achievements:
                    achievements = json.loads(w.achievements)
            except:
                pass
            if not achievements and w.description:
                achievements = [w.description]

            experience_list.append({
                "company": w.company,
                "role": w.role,
                "start_date": w.start_date or w.period or None,
                "end_date": w.end_date or None,
                "achievements": achievements
            })

        projects_certs = []
        for p in current_user.projects:
            projects_certs.append({
                "title": p.name,
                "description": p.description or None,
                "link_or_credential": p.link_or_credential or None
            })

        profile_json = {
            "cv_profile": {
                "contact_information": {
                    "full_name": current_user.full_name,
                    "email": current_user.email,
                    "phone": current_user.phone,
                    "location": location or None
                },
                "professional_summary": current_user.summary or None,
                "education": education_list,
                "work_experience": experience_list,
                "skills": {
                    "technical_or_hard_skills": skills_list,
                    "languages": languages_list
                },
                "projects_and_certifications": projects_certs
            }
        }
        
        json_str = json.dumps(profile_json, indent=2)
        io_stream = io.BytesIO(json_str.encode('utf-8'))
        return StreamingResponse(
            io_stream,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=placement_ai_cv_{current_user.id}.json"}
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
