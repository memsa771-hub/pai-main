from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    linkedin: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Sub-components
class EducationBase(BaseModel):
    degree: str
    school: str
    major: Optional[str] = None
    period: Optional[str] = None
    graduation_year: Optional[str] = None
    gpa: Optional[str] = None
    details: Optional[str] = None

class EducationCreate(EducationBase):
    pass

class EducationResponse(EducationBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class WorkExperienceBase(BaseModel):
    role: str
    company: str
    period: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    achievements: Optional[List[str]] = None

class WorkExperienceCreate(WorkExperienceBase):
    pass

class WorkExperienceResponse(WorkExperienceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    link_or_credential: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Profile Updates
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    linkedin: Optional[str] = None
    current_education: Optional[str] = None
    current_status: Optional[str] = None
    intended_destination: Optional[str] = None
    intended_degree: Optional[str] = None
    preferred_field: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    career_goals_short: Optional[str] = None
    career_goals_long: Optional[str] = None

# Main profile response
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    linkedin: Optional[str] = None
    current_education: Optional[str] = None
    current_status: Optional[str] = None
    intended_destination: Optional[str] = None
    intended_degree: Optional[str] = None
    preferred_field: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[str] = "[]" # JSON string
    languages: Optional[str] = "[]" # JSON string
    goals: Optional[str] = "[]" # JSON string
    career_goals_short: Optional[str] = None
    career_goals_long: Optional[str] = None
    avatar: Optional[str] = None
    
    education: List[EducationResponse] = []
    work_experience: List[WorkExperienceResponse] = []
    projects: List[ProjectResponse] = []

    class Config:
        from_attributes = True

# Documents
class DocumentResponse(BaseModel):
    id: str
    name: str
    type: str
    last_edited: Optional[str] = None
    status: str
    progress: Optional[int] = None
    author: Optional[str] = None
    file_path: Optional[str] = None

    class Config:
        from_attributes = True

# Tracked Universities
class TrackedUniversityCreate(BaseModel):
    name: str
    location: Optional[str] = None
    avg_gpa: Optional[str] = None
    avg_gre: Optional[str] = None
    deadlines: Optional[str] = None
    status: str # Interested, Planning, Applied
    acceptance_rate: Optional[str] = None
    reqs: Optional[List[str]] = None

class TrackedUniversityResponse(BaseModel):
    id: int
    name: str
    location: Optional[str] = None
    avg_gpa: Optional[str] = None
    avg_gre: Optional[str] = None
    deadlines: Optional[str] = None
    status: str
    acceptance_rate: Optional[str] = None
    reqs: Optional[str] = "[]" # JSON string

    class Config:
        from_attributes = True

# Roadmap Step
class RoadmapStepResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: Optional[str] = None
    type: Optional[str] = None

    class Config:
        from_attributes = True

class RoadmapSectionResponse(BaseModel):
    number: int
    title: str
    steps: List[RoadmapStepResponse] = []

    class Config:
        from_attributes = True

class UniversityRoadmapResponse(BaseModel):
    university: str
    degree: Optional[str] = None
    term: Optional[str] = None
    progress: int
    sections: List[RoadmapSectionResponse] = []

# Chat
class ChatMessageCreate(BaseModel):
    text: str
    session_id: Optional[str] = None # If null, start a new chat session

class ChatMessageResponse(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True

class ChatSessionListResponse(BaseModel):
    id: str
    title: str
    updated_at: datetime

    class Config:
        from_attributes = True
