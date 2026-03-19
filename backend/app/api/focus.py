from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.focus import FocusSessionResponse, FocusSessionCreate, SubjectResponse
from app.services.focus import FocusService
from app.api.deps import get_current_active_user
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter(prefix="/focus", tags=["focus"])

@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(db: AsyncSession = Depends(get_db)):
    return await FocusService.get_subjects(db)

@router.post("/sessions", response_model=FocusSessionResponse)
async def start_session(
    session_in: FocusSessionCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await FocusService.start_session(db, current_user.id, session_in)

@router.post("/sessions/{session_id}/end", response_model=FocusSessionResponse)
async def end_session(
    session_id: UUID, 
    duration_mins: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # 此处 FocusService 内应有逻辑校验 session 是否属于当前用户
    session = await FocusService.end_session(db, session_id, duration_mins)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/history", response_model=List[FocusSessionResponse])
async def get_my_history(
    limit: int = 10, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await FocusService.get_user_sessions(db, current_user.id, limit)
