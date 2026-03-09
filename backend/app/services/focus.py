from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.focus import FocusSession, Subject
from app.schemas.focus import FocusSessionCreate
from uuid import UUID
from datetime import datetime

class FocusService:
    @staticmethod
    async def get_subjects(db: AsyncSession):
        result = await db.execute(select(Subject))
        return result.scalars().all()

    @staticmethod
    async def start_session(db: AsyncSession, user_id: UUID, session_in: FocusSessionCreate):
        db_session = FocusSession(
            user_id=user_id,
            subject_id=session_in.subject_id,
            squad_id=session_in.squad_id,
            start_time=datetime.utcnow(),
            status="IN_PROGRESS"
        )
        db.add(db_session)
        await db.commit()
        await db.refresh(db_session)
        return db_session

    @staticmethod
    async def end_session(db: AsyncSession, session_id: UUID, duration_mins: int):
        result = await db.execute(select(FocusSession).where(FocusSession.id == session_id))
        db_session = result.scalars().first()
        if not db_session:
            return None
        
        db_session.end_time = datetime.utcnow()
        db_session.duration_mins = duration_mins
        db_session.status = "COMPLETED"
        
        await db.commit()
        await db.refresh(db_session)
        return db_session

    @staticmethod
    async def get_user_sessions(db: AsyncSession, user_id: UUID, limit: int = 10):
        result = await db.execute(
            select(FocusSession)
            .where(FocusSession.user_id == user_id)
            .order_by(FocusSession.start_time.desc())
            .limit(limit)
        )
        return result.scalars().all()
