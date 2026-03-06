from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from uuid import UUID
from datetime import datetime

class ProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=200)
    theme_preference: str = "classic"
    daily_goal_mins: int = 120

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    daily_goal_mins: Optional[int] = None

class Profile(ProfileBase):
    total_focus_mins: int
    total_sparks: int
    updated_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class User(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    profile: Optional[Profile] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
