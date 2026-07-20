"""User / profile ORM models (CLAUDE.md section 4 ``modules/users``)."""

from __future__ import annotations

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    supabase_id = Column(String(64), unique=True, index=True, nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    dob = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    nationality = Column(String(50), nullable=True)
    country = Column(String(50), nullable=True)
    city = Column(String(50), nullable=True)
    linkedin = Column(String(255), nullable=True)
    current_education = Column(String(100), nullable=True)
    current_status = Column(String(100), nullable=True)
    intended_destination = Column(String(100), nullable=True)
    intended_degree = Column(String(100), nullable=True)
    preferred_field = Column(String(100), nullable=True)
    summary = Column(Text, nullable=True)
    skills = Column(Text, nullable=True, default="[]")
    languages = Column(Text, nullable=True, default="[]")
    goals = Column(Text, nullable=True, default="[]")
    career_goals_short = Column(Text, nullable=True)
    career_goals_long = Column(Text, nullable=True)
    avatar = Column(String(255), nullable=True, default="/avatar.webp")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    education = relationship("Education", back_populates="user", cascade="all, delete-orphan")
    work_experience = relationship(
        "WorkExperience", back_populates="user", cascade="all, delete-orphan"
    )
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    tracked_universities = relationship(
        "TrackedUniversity", back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )
    roadmaps = relationship(
        "RoadmapSection", back_populates="user", cascade="all, delete-orphan"
    )


class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    degree = Column(String(100), nullable=False)
    school = Column(String(150), nullable=False)
    major = Column(String(150), nullable=True)
    period = Column(String(50), nullable=True)
    graduation_year = Column(String(10), nullable=True)
    gpa = Column(String(20), nullable=True)
    details = Column(Text, nullable=True)

    user = relationship("User", back_populates="education")


class WorkExperience(Base):
    __tablename__ = "work_experience"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String(100), nullable=False)
    company = Column(String(150), nullable=False)
    period = Column(String(50), nullable=True)
    start_date = Column(String(30), nullable=True)
    end_date = Column(String(30), nullable=True, default="Present")
    description = Column(Text, nullable=True)
    achievements = Column(Text, nullable=True, default="[]")

    user = relationship("User", back_populates="work_experience")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    link_or_credential = Column(String(255), nullable=True)

    user = relationship("User", back_populates="projects")


class RoadmapSection(Base):
    __tablename__ = "roadmap_sections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    university = Column(String(150), nullable=False)
    degree = Column(String(100), nullable=True)
    term = Column(String(50), nullable=True)
    progress = Column(Integer, default=0)
    number = Column(Integer, nullable=False)
    title = Column(String(100), nullable=False)

    user = relationship("User", back_populates="roadmaps")
    steps = relationship("RoadmapStep", back_populates="section", cascade="all, delete-orphan")


class RoadmapStep(Base):
    __tablename__ = "roadmap_steps"

    id = Column(String(50), primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("roadmap_sections.id"))
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), nullable=False)
    priority = Column(String(20), nullable=True)
    type = Column(String(50), nullable=True)

    section = relationship("RoadmapSection", back_populates="steps")
