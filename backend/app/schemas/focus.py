from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class SubjectBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color_hex: Optional[str] = None

class Subject(SubjectBase):
    id: int

    class Config:
        from_attributes = True

class FocusSessionBase(BaseModel):
    subject_id: int
    squad_id: Optional[UUID] = None

class FocusSessionCreate(FocusSessionBase):
    pass

class FocusSession(FocusSessionBase):
    id: UUID
    user_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_mins: int
    status: str

    class Config:
        from_attributes = True

class FocusStats(BaseModel):
    total_mins: int
    session_count: int
    top_subject: Optional[str] = None
