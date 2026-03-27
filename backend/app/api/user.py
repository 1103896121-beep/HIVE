from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.validator import validate_content
from app.schemas.user import ProfileResponse, ProfileUpdate, UserSearchResponse, PasswordUpdate
from app.services.user import UserService
from app.api.deps import get_current_active_user
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取当前登录用户的个人资料"""
    profile = await UserService.get_profile(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.get("/profile/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: UUID, db: AsyncSession = Depends(get_db)):
    profile = await UserService.get_profile(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.patch("/profile/{user_id}", response_model=ProfileResponse)
async def update_profile(
    user_id: UUID, 
    profile_in: ProfileUpdate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 安全校验：只能修改自己的资料
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if profile_in.name is not None and not validate_content(profile_in.name):
        raise HTTPException(status_code=400, detail="Name contains inappropriate content")
    if profile_in.bio is not None and not validate_content(profile_in.bio):
        raise HTTPException(status_code=400, detail="Bio contains inappropriate content")
    if profile_in.city is not None and not validate_content(profile_in.city):
        raise HTTPException(status_code=400, detail="City contains inappropriate content")
        
    profile = await UserService.update_profile(db, user_id, profile_in, background_tasks)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.delete("/profile/{user_id}")
async def delete_account(
    user_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 安全校验：只能删除自己的账号
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    success = await UserService.delete_account(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "Account deleted successfully"}

@router.post("/profile/{user_id}/password")
async def update_password(
    user_id: UUID, 
    pwd_in: PasswordUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 安全校验
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    success, message = await UserService.update_password(db, user_id, pwd_in.current_password, pwd_in.new_password, pwd_in.confirm_password)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@router.get("/search", response_model=List[UserSearchResponse])
async def search_users(
    q: str, 
    lat: float = None, 
    lon: float = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not q or len(q) < 2:
        return []
        
    return await UserService.search_users(db, q, current_user.id, lat, lon)
