from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.validator import validate_content
from app.schemas.user import ProfileResponse, ProfileUpdate, UserSearchResponse, PasswordUpdate
from app.services.user import UserService
from uuid import UUID
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: UUID, db: AsyncSession = Depends(get_db)):
    profile = await UserService.get_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.patch("/profile/{user_id}", response_model=ProfileResponse)
async def update_profile(user_id: UUID, profile_in: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    if profile_in.name is not None and not validate_content(profile_in.name):
        raise HTTPException(status_code=400, detail="Name contains inappropriate content")
    if profile_in.bio is not None and not validate_content(profile_in.bio):
        raise HTTPException(status_code=400, detail="Bio contains inappropriate content")
    if profile_in.city is not None and not validate_content(profile_in.city):
        raise HTTPException(status_code=400, detail="City contains inappropriate content")
        
    profile = await UserService.update_profile(db, user_id, profile_in)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.delete("/profile/{user_id}")
async def delete_account(user_id: UUID, db: AsyncSession = Depends(get_db)):
    success = await UserService.delete_account(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "Account deleted successfully"}

@router.post("/profile/{user_id}/password")
async def update_password(user_id: UUID, pwd_in: PasswordUpdate, db: AsyncSession = Depends(get_db)):
    success, message = await UserService.update_password(db, user_id, pwd_in.current_password, pwd_in.new_password, pwd_in.confirm_password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@router.get("/search", response_model=List[UserSearchResponse])
async def search_users(
    q: str, 
    lat: float = None, 
    lon: float = None,
    user_id: str = "current-user-placeholder", # TODO: Use real auth dependency
    db: AsyncSession = Depends(get_db)
):
    if not q or len(q) < 2:
        return []
    # Convert string placeholder to UUID if needed, but in real app this comes from JWT
    from uuid import UUID
    try:
        curr_id = UUID(user_id) if "-" in user_id else UUID("00000000-0000-0000-0000-000000000000")
    except ValueError:
        curr_id = UUID("00000000-0000-0000-0000-000000000000")
        
    return await UserService.search_users(db, q, curr_id, lat, lon)
