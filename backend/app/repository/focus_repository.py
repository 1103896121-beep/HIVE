from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.focus import FocusSession, Subject
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class FocusRepository:
    @staticmethod
    async def get_all_subjects(db: AsyncSession) -> List[Subject]:
        result = await db.execute(select(Subject))
        return result.scalars().all()

    @staticmethod
    async def create_session(db: AsyncSession, session: FocusSession) -> FocusSession:
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session_by_id(db: AsyncSession, session_id: UUID) -> Optional[FocusSession]:
        result = await db.execute(select(FocusSession).where(FocusSession.id == session_id))
        return result.scalars().first()

    @staticmethod
    async def get_user_sessions(db: AsyncSession, user_id: UUID, limit: int = 10) -> List[FocusSession]:
        result = await db.execute(
            select(FocusSession)
            .where(FocusSession.user_id == user_id)
            .order_by(FocusSession.start_time.desc())
            .limit(limit)
        )
        return result.scalars().all()
    @staticmethod
    async def commit(db: AsyncSession) -> None:
        await db.commit()
    @staticmethod
    async def refresh(db: AsyncSession, item) -> None:
        await db.refresh(item)
