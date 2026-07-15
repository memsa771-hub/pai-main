import os
import io
import json
import uuid
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.auth import get_current_user
from app.utils.openai_client import call_deepseek
import pypdf
import docx2txt

router = APIRouter(prefix="/api/documents", tags=["Document Intelligence"])

def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    
    if ext == ".pdf":
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            print(f"[Parser] Error reading PDF: {e}")
            raise HTTPException(status_code=400, detail="Failed to parse PDF document.")
            
    elif ext == ".docx":
        try:
            # docx2txt requires a path on windows, so write to a temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
                temp_file.write(file_bytes)
                temp_file_path = temp_file.name
            try:
                text = docx2txt.process(temp_file_path)
            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
        except Exception as e:
            print(f"[Parser] Error reading DOCX: {e}")
            raise HTTPException(status_code=400, detail="Failed to parse DOCX document.")
            
    elif ext == ".txt":
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception:
                raise HTTPException(status_code=400, detail="Failed to decode text file.")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Upload PDF, DOCX, or TXT.")
        
    return text

@router.get("", response_model=list[schemas.DocumentResponse])
def get_documents(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Document).filter(models.Document.user_id == current_user.id).all()

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    university: str = Form("Stanford University"),
    type: str = Form("Resume"), # SOP, LOR, Resume, Transcript, Other
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_bytes = await file.read()
    
    # 1. Save Document record as pending
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    db_doc = models.Document(
        id=doc_id,
        user_id=current_user.id,
        name=file.filename,
        type=type,
        last_edited="Just now",
        status="pending",
        progress=10 if type == "SOP" else 100
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    # 2. Extract Text
    raw_text = extract_text(file_bytes, file.filename)
    db_doc.content = raw_text
    db.commit()
    
    # 3. Trigger Document Intelligence Agent (DeepSeek)
    if type == "Resume":
        print("[Agent] Triggering Document Intelligence Agent on Resume...")
        system_prompt = (
            "You are a Resume Parser Agent. Extract structured details from the following resume text "
            "and return ONLY valid JSON (no markdown backticks or explanations).\n"
            "Extract:\n"
            "- summary: string (professional summary / elevator pitch)\n"
            "- skills: list of strings (technical/hard skills)\n"
            "- languages: list of strings (spoken languages)\n"
            "- education: list of dicts with: degree, school, major, period, graduation_year, gpa, details\n"
            "- work_experience: list of dicts with: role, company, start_date, end_date, period, description, "
            "achievements (list of quantifiable impact bullet points)\n"
            "- projects: list of dicts with: name, description, link_or_credential"
        )
        
        try:
            ai_res = call_deepseek(system_prompt, raw_text)
            # Strip markdown quotes if any
            clean_json = ai_res.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            parsed_data = json.loads(clean_json)
            
            # Sync to Database
            if parsed_data.get("summary"):
                current_user.summary = parsed_data["summary"]
                
            if parsed_data.get("skills"):
                # Merge skills
                existing_skills = []
                try:
                    if current_user.skills:
                        existing_skills = json.loads(current_user.skills)
                except:
                    pass
                merged_skills = list(set(existing_skills + parsed_data["skills"]))
                current_user.skills = json.dumps(merged_skills)

            if parsed_data.get("languages"):
                # Merge languages
                existing_langs = []
                try:
                    if current_user.languages:
                        existing_langs = json.loads(current_user.languages)
                except:
                    pass
                merged_langs = list(set(existing_langs + parsed_data["languages"]))
                current_user.languages = json.dumps(merged_langs)
                
            # Add Education
            for edu in parsed_data.get("education", []):
                # Avoid exact duplicates
                dup = db.query(models.Education).filter(
                    models.Education.user_id == current_user.id,
                    models.Education.degree == edu.get("degree"),
                    models.Education.school == edu.get("school")
                ).first()
                if not dup:
                    db_edu = models.Education(
                        user_id=current_user.id,
                        degree=edu.get("degree"),
                        school=edu.get("school"),
                        major=edu.get("major"),
                        period=edu.get("period"),
                        graduation_year=edu.get("graduation_year"),
                        gpa=edu.get("gpa"),
                        details=edu.get("details")
                    )
                    db.add(db_edu)
                    
            # Add Experience
            for exp in parsed_data.get("work_experience", []):
                dup = db.query(models.WorkExperience).filter(
                    models.WorkExperience.user_id == current_user.id,
                    models.WorkExperience.role == exp.get("role"),
                    models.WorkExperience.company == exp.get("company")
                ).first()
                if not dup:
                    achievements = exp.get("achievements", [])
                    db_exp = models.WorkExperience(
                        user_id=current_user.id,
                        role=exp.get("role"),
                        company=exp.get("company"),
                        period=exp.get("period"),
                        start_date=exp.get("start_date"),
                        end_date=exp.get("end_date"),
                        description=exp.get("description"),
                        achievements=json.dumps(achievements) if achievements else "[]"
                    )
                    db.add(db_exp)
                    
            # Add Projects
            for proj in parsed_data.get("projects", []):
                dup = db.query(models.Project).filter(
                    models.Project.user_id == current_user.id,
                    models.Project.name == proj.get("name")
                ).first()
                if not dup:
                    db_proj = models.Project(
                        user_id=current_user.id,
                        name=proj.get("name"),
                        description=proj.get("description"),
                        link_or_credential=proj.get("link_or_credential")
                    )
                    db.add(db_proj)
                    
            db_doc.status = "completed"
            db_doc.progress = 100
            db.commit()
            print("[Agent] Resume parsed and vault successfully updated.")
        except Exception as ex:
            print(f"[Agent] Resume extraction failed: {ex}")
            db_doc.status = "draft"
            db_doc.progress = 0
            db.commit()
            
    elif type == "SOP":
        print("[Agent] Triggering SOP Optimization Scanner...")
        system_prompt = (
            "You are an SOP Editor Agent. Review this Statement of Purpose. Rate its effectiveness from 0 to 100. "
            "Provide an optimized, more professional version of this text that highlights academic achievements, research interest, "
            "and clear motives. Return strictly a JSON object with: 'score' (integer between 0 and 100) and 'optimized_text' (string)."
        )
        try:
            ai_res = call_deepseek(system_prompt, raw_text)
            clean_json = ai_res.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            clean_json = clean_json.strip()
            
            parsed_data = json.loads(clean_json)
            
            db_doc.status = "optimized"
            db_doc.progress = parsed_data.get("score", 85)
            db_doc.optimized_content = parsed_data.get("optimized_text", raw_text)
            db.commit()
            print("[Agent] SOP optimized successfully.")
        except Exception as ex:
            print(f"[Agent] SOP optimization failed: {ex}")
            db_doc.status = "draft"
            db_doc.progress = 50
            db.commit()
            
    else:
        # LOR, Transcripts, etc.
        db_doc.status = "completed"
        db_doc.progress = 100
        db.commit()
        
    db.refresh(db_doc)
    return db_doc
