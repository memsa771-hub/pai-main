import json
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.infrastructure.database import get_async_db
from app.core.security import get_current_user_async, load_user_by_id
from app.modules.documents.cv_generator import generate_docx_resume, generate_pdf_resume

router = APIRouter(prefix="/api/profile", tags=["Profile Management"])


@router.put("", response_model=schemas.UserResponse)
async def update_profile(
    profile_in: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    update_data = profile_in.model_dump(exclude_unset=True)

    if "skills" in update_data and update_data["skills"] is not None:
        current_user.skills = json.dumps(update_data.pop("skills"))
    if "languages" in update_data and update_data["languages"] is not None:
        current_user.languages = json.dumps(update_data.pop("languages"))
    if "goals" in update_data and update_data["goals"] is not None:
        current_user.goals = json.dumps(update_data.pop("goals"))

    for key, value in update_data.items():
        setattr(current_user, key, value)

    await db.commit()
    user = await load_user_by_id(db, current_user.id)
    return user


@router.post("/education", response_model=schemas.EducationResponse)
async def add_education(
    edu_in: schemas.EducationCreate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    new_edu = models.Education(
        user_id=current_user.id,
        degree=edu_in.degree,
        school=edu_in.school,
        major=edu_in.major,
        period=edu_in.period,
        graduation_year=edu_in.graduation_year,
        gpa=edu_in.gpa,
        details=edu_in.details,
    )
    db.add(new_edu)
    await db.commit()
    await db.refresh(new_edu)
    return new_edu


@router.delete("/education/{edu_id}")
async def delete_education(
    edu_id: int,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.Education).where(
            models.Education.id == edu_id, models.Education.user_id == current_user.id
        )
    )
    edu = result.scalar_one_or_none()
    if not edu:
        raise HTTPException(status_code=404, detail="Education record not found")
    await db.delete(edu)
    await db.commit()
    return {"detail": "Education record deleted"}


@router.post("/experience", response_model=schemas.WorkExperienceResponse)
async def add_experience(
    exp_in: schemas.WorkExperienceCreate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    achievements_json = json.dumps(exp_in.achievements) if exp_in.achievements else "[]"
    new_exp = models.WorkExperience(
        user_id=current_user.id,
        role=exp_in.role,
        company=exp_in.company,
        period=exp_in.period,
        start_date=exp_in.start_date,
        end_date=exp_in.end_date,
        description=exp_in.description,
        achievements=achievements_json,
    )
    db.add(new_exp)
    await db.commit()
    await db.refresh(new_exp)
    return new_exp


@router.delete("/experience/{exp_id}")
async def delete_experience(
    exp_id: int,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.WorkExperience).where(
            models.WorkExperience.id == exp_id,
            models.WorkExperience.user_id == current_user.id,
        )
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience record not found")
    await db.delete(exp)
    await db.commit()
    return {"detail": "Experience record deleted"}


@router.post("/project", response_model=schemas.ProjectResponse)
async def add_project(
    proj_in: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    new_proj = models.Project(
        user_id=current_user.id,
        name=proj_in.name,
        description=proj_in.description,
        link_or_credential=proj_in.link_or_credential,
    )
    db.add(new_proj)
    await db.commit()
    await db.refresh(new_proj)
    return new_proj


@router.delete("/project/{proj_id}")
async def delete_project(
    proj_id: int,
    current_user: models.User = Depends(get_current_user_async),
    db: AsyncSession = Depends(get_async_db),
):
    result = await db.execute(
        select(models.Project).where(
            models.Project.id == proj_id, models.Project.user_id == current_user.id
        )
    )
    proj = result.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project record not found")
    await db.delete(proj)
    await db.commit()
    return {"detail": "Project record deleted"}


@router.get("/export")
async def export_cv(
    template: str = Query("ats", description="Templates: europass, ats, modern, academic"),
    format: str = Query("docx", description="Formats: docx, pdf, json"),
    current_user: models.User = Depends(get_current_user_async),
):
    if format == "json":
        skills_list = []
        try:
            if current_user.skills:
                skills_list = json.loads(current_user.skills)
        except Exception:  # noqa: BLE001
            pass

        languages_list = []
        try:
            if current_user.languages:
                languages_list = json.loads(current_user.languages)
        except Exception:  # noqa: BLE001
            pass

        location = ", ".join(filter(None, [current_user.city, current_user.country]))

        education_list = []
        for e in current_user.education:
            education_list.append(
                {
                    "institution": e.school,
                    "degree": e.degree,
                    "major": e.major or None,
                    "graduation_year": e.graduation_year or e.period or None,
                    "gpa_or_grades": e.gpa or None,
                }
            )

        experience_list = []
        for w in current_user.work_experience:
            achievements = []
            try:
                if w.achievements:
                    achievements = json.loads(w.achievements)
            except Exception:  # noqa: BLE001
                pass
            if not achievements and w.description:
                achievements = [w.description]
            experience_list.append(
                {
                    "company": w.company,
                    "role": w.role,
                    "start_date": w.start_date or w.period or None,
                    "end_date": w.end_date or None,
                    "achievements": achievements,
                }
            )

        projects_certs = [
            {
                "title": p.name,
                "description": p.description or None,
                "link_or_credential": p.link_or_credential or None,
            }
            for p in current_user.projects
        ]

        profile_json = {
            "cv_profile": {
                "contact_information": {
                    "full_name": current_user.full_name,
                    "email": current_user.email,
                    "phone": current_user.phone,
                    "location": location or None,
                },
                "professional_summary": current_user.summary or None,
                "education": education_list,
                "work_experience": experience_list,
                "skills": {
                    "technical_or_hard_skills": skills_list,
                    "languages": languages_list,
                },
                "projects_and_certifications": projects_certs,
            }
        }
        io_stream = io.BytesIO(json.dumps(profile_json, indent=2).encode("utf-8"))
        return StreamingResponse(
            io_stream,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=placement_ai_cv_{current_user.id}.json"
            },
        )

    if format == "docx":
        docx_stream = generate_docx_resume(current_user, template)
        return StreamingResponse(
            docx_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename=placement_ai_resume_{template}.docx"
            },
        )

    if format == "pdf":
        pdf_stream = generate_pdf_resume(current_user, template)
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=placement_ai_resume_{template}.pdf"
            },
        )

    raise HTTPException(status_code=400, detail="Invalid format specified. Must be json, docx, or pdf.")
