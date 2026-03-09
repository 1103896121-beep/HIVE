from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.focus import FocusSessionResponse, FocusSessionCreate, SubjectResponse
from app.services.focus import FocusService
from uuid import UUID
from typing import List

router = APIRouter(prefix="/focus", tags=["focus"])

@router.get("/subjects", response_model=List[SubjectResponse])
async def get_subjects(db: AsyncSession = Depends(get_db)):
    return await FocusService.get_subjects(db)

@router.post("/sessions", response_model=FocusSessionResponse)
async def start_session(session_in: FocusSessionCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    # 注意：实际应用中 user_id 应从 Token 中获取，这里为了原型演示通过 Query 传入
    return await FocusService.start_session(db, user_id, session_in)

@router.post("/sessions/{session_id}/end", response_model=FocusSessionResponse)
async def end_session(session_id: UUID, duration_mins: int, db: AsyncSession = Depends(get_db)):
    session = await FocusService.end_session(db, session_id, duration_mins)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/history/{user_id}", response_model=List[FocusSessionResponse])
async def get_history(user_id: UUID, limit: int = 10, db: AsyncSession = Depends(get_db)):
    return await FocusService.get_user_sessions(db, user_id, limit)
