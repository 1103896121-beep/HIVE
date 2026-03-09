from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import ProfileResponse, ProfileUpdate
from app.services.user import UserService
from uuid import UUID

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: UUID, db: AsyncSession = Depends(get_db)):
    profile = await UserService.get_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.patch("/profile/{user_id}", response_model=ProfileResponse)
async def update_profile(user_id: UUID, profile_in: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    profile = await UserService.update_profile(db, user_id, profile_in)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
