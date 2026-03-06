from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class SquadBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    is_private: bool = False

class SquadCreate(SquadBase):
    pass

class Squad(SquadBase):
    id: UUID
    invite_code: str
    created_at: datetime

    class Config:
        from_attributes = True

class SquadMember(BaseModel):
    user_id: UUID
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

class BondBase(BaseModel):
    user_id_2: UUID

class Bond(BaseModel):
    user_id_1: UUID
    user_id_2: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class NudgeCreate(BaseModel):
    receiver_id: UUID
    nudge_type: str = "VIBRATE"

class Nudge(NudgeCreate):
    id: int
    sender_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
