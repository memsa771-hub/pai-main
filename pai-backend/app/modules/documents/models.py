"""Document ORM model (CLAUDE.md Âsection 4 ``modules/documents``)."""

from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.infrastructure.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False)
    file_path = Column(String(255), nullable=True)
    last_edited = Column(String(50), nullable=True)
    status = Column(String(30), nullable=False)
    progress = Column(Integer, nullable=True)
    author = Column(String(100), nullable=True)
    content = Column(Text, nullable=True)
    optimized_content = Column(Text, nullable=True)

    user = relationship("User", back_populates="documents")
