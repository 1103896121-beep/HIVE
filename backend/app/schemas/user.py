from pydantic import BaseModel, EmailStr, HttpUrl
from uuid import UUID
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileBase(BaseModel):
    name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    theme_preference: Optional[str] = "classic"
    daily_goal_mins: Optional[int] = 120

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    daily_goal_mins: Optional[int] = None

class ProfileResponse(ProfileBase):
    user_id: UUID
    total_focus_mins: int
    total_sparks: int
    trial_start_at: datetime
    subscription_end_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class UserSearchResponse(BaseModel):
    id: UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    total_focus_mins: int = 0
    total_sparks: int = 0

    class Config:
        from_attributes = True
