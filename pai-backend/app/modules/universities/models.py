"""Tracked / catalogue university ORM (CLAUDE.md section 4 ``modules/universities``)."""

from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database import Base


class TrackedUniversity(Base):
    __tablename__ = "tracked_universities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(150), nullable=False)
    location = Column(String(100), nullable=True)
    avg_gpa = Column(String(50), nullable=True)
    avg_gre = Column(String(50), nullable=True)
    deadlines = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)
    acceptance_rate = Column(String(20), nullable=True)
    reqs = Column(Text, nullable=True, default="[]")

    user = relationship("User", back_populates="tracked_universities")
