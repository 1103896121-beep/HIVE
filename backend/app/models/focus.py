from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=True)
    color_hex = Column(String(7), nullable=True)

    sessions = relationship("FocusSession", back_populates="subject")

class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    squad_id = Column(UUID(as_uuid=True), ForeignKey("squads.id"), nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True, index=True)
    duration_mins = Column(Integer, default=0)
    status = Column(String(20), default="COMPLETED", index=True) # COMPLETED, INTERRUPTED

    user = relationship("User", back_populates="focus_sessions")
    subject = relationship("Subject", back_populates="sessions")
    squad = relationship("Squad", back_populates="sessions")
