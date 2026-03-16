from sqlalchemy.ext.asyncio import AsyncSession
from app.models.focus import FocusSession, Subject
from app.schemas.focus import FocusSessionCreate
from app.repository.focus_repository import FocusRepository
from app.repository.user_repository import UserRepository
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from typing import List, Optional

class FocusService:
    @staticmethod
    async def get_subjects(db: AsyncSession) -> List[Subject]:
        """
        获取预定义的专注科目列表。
        通过 Repository 抽象数据库查询，确保 Service 只关注科目列表的获取逻辑。
        """
        return await FocusRepository.get_all_subjects(db)

    @staticmethod
    async def start_session(db: AsyncSession, user_id: UUID, session_in: FocusSessionCreate) -> FocusSession:
        """
        开启专注会话。
        包含核心的权限校验：必须在 7 天试用期内，或拥有有效订阅。
        这种硬性校验确保了应用的商业化闭环。
        """
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 检查是否在7天试用期内
        trial_expired = datetime.utcnow() > (user.trial_start_at + timedelta(days=7))
        
        # 检查是否有有效订阅
        has_active_subscription = user.subscription_end_at and user.subscription_end_at > datetime.utcnow()

        if trial_expired and not has_active_subscription:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Trial expired. Subscription required to start focus sessions."
            )

        db_session = FocusSession(
            user_id=user_id,
            subject_id=session_in.subject_id,
            squad_id=session_in.squad_id,
            start_time=datetime.utcnow(),
            status="IN_PROGRESS"
        )
        return await FocusRepository.create_session(db, db_session)

    @staticmethod
    async def end_session(db: AsyncSession, session_id: UUID, duration_mins: int) -> Optional[FocusSession]:
        """
        结束专注会话并同步进度。
        设计上采用原子操作同步更新 Session 状态与 User Profile 中的积分(Sparks)及总时长，
        确保存档数据的一致性。
        """
        db_session = await FocusRepository.get_session_by_id(db, session_id)
        if not db_session:
            return None
        
        db_session.end_time = datetime.utcnow()
        db_session.duration_mins = duration_mins
        db_session.status = "COMPLETED"

        # 核心：同步更新用户的总专注时长和星火
        db_profile = await UserRepository.get_profile(db, db_session.user_id)
        if db_profile:
            db_profile.total_focus_mins += duration_mins
            db_profile.total_sparks += duration_mins
        
        await FocusRepository.commit(db)
        await FocusRepository.refresh(db, db_session)
        return db_session

    @staticmethod
    async def get_user_sessions(db: AsyncSession, user_id: UUID, limit: int = 10) -> List[FocusSession]:
        return await FocusRepository.get_user_sessions(db, user_id, limit)
