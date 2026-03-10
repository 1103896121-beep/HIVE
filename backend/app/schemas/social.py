from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class SquadBase(BaseModel):
    name: str
    is_private: bool = False

class SquadCreate(SquadBase):
    pass

class SquadResponse(SquadBase):
    id: UUID
    created_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True

class SquadMemberAction(BaseModel):
    user_id: UUID

class SquadApplyAction(BaseModel):
    squad_id: UUID

class BondBase(BaseModel):
    user_id_2: UUID

class BondResponse(BaseModel):
    user_id_1: UUID
    user_id_2: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class NudgeCreate(BaseModel):
    receiver_id: UUID
    nudge_type: str = "VIBRATE"

class ReportCreate(BaseModel):
    target_id: UUID
    target_type: str # "USER" or "SQUAD"
    reason: str

class ReportResponse(BaseModel):
    id: int
    reporter_id: UUID
    target_id: UUID
    target_type: str
    reason: str
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

class BlockCreate(BaseModel):
    blocked_id: UUID

class BlockResponse(BaseModel):
    user_id: UUID
    blocked_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileSimpleResponse(BaseModel):
    user_id: UUID
    name: str
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    total_focus_mins: int = 0
    total_sparks: int = 0

    class Config:
        from_attributes = True

class BondEnrichedResponse(BaseModel):
    user_id_1: UUID
    user_id_2: UUID
    status: str
    created_at: datetime
    other_user: ProfileSimpleResponse

    class Config:
        from_attributes = True
