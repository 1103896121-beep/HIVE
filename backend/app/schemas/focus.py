from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class SubjectBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color_hex: Optional[str] = None

class SubjectResponse(SubjectBase):
    id: int

    class Config:
        from_attributes = True

class FocusSessionBase(BaseModel):
    subject_id: int
    squad_id: Optional[UUID] = None

class FocusSessionCreate(FocusSessionBase):
    pass

class FocusSessionResponse(FocusSessionBase):
    id: UUID
    user_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_mins: int
    status: str

    class Config:
        from_attributes = True
