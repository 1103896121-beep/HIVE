from sqlalchemy import or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Profile, ProcessedTransaction
from app.models.social import SquadMember, Bond, Nudge, Report, Block
from app.models.focus import FocusSession
from uuid import UUID
from typing import Optional, List, Tuple

class UserRepository:
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def get_user_by_apple_sub(db: AsyncSession, apple_sub: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.apple_sub == apple_sub))
        return result.scalars().first()

    @staticmethod
    async def get_profile_with_trial(db: AsyncSession, user_id: UUID) -> Optional[Tuple[Profile, Optional[str], Optional[str]]]:
        result = await db.execute(
            select(Profile, User.trial_start_at, User.subscription_end_at)
            .join(User, Profile.user_id == User.id)
            .where(Profile.user_id == user_id)
        )
        return result.first()

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: UUID) -> Optional[Profile]:
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user: User) -> User:
        db.add(user)
        return user

    @staticmethod
    async def create_profile(db: AsyncSession, profile: Profile) -> Profile:
        db.add(profile)
        return profile

    @staticmethod
    async def delete_item(db: AsyncSession, item) -> None:
        await db.delete(item)

    @staticmethod
    async def get_block_ids(db: AsyncSession, user_id: UUID) -> Tuple[List[UUID], List[UUID]]:
        block_query = await db.execute(
            select(Block.blocked_id).where(Block.user_id == user_id)
        )
        blocked_by_me = [r[0] for r in block_query.all()]
        
        blocker_query = await db.execute(
            select(Block.user_id).where(Block.blocked_id == user_id)
        )
        blocked_me = [r[0] for r in blocker_query.all()]
        return blocked_by_me, blocked_me

    @staticmethod
    async def search_profiles(db: AsyncSession, search_pattern: str, exclude_ids: set) -> List[tuple]:
        stmt = (
            select(
                User.id, 
                User.email, 
                Profile.name, 
                Profile.avatar_url, 
                Profile.city, 
                Profile.bio,
                Profile.total_focus_mins,
                Profile.total_sparks,
                Profile.latitude,
                Profile.longitude
            )
            .join(Profile, User.id == Profile.user_id)
            .where(
                and_(
                    or_(
                        Profile.name.ilike(search_pattern),
                        User.email.ilike(search_pattern)
                    ),
                    User.is_active == True,
                    User.id.not_in(exclude_ids)
                )
            )
            .limit(50)
        )
        result = await db.execute(stmt)
        return result.all()
    @staticmethod
    async def is_transaction_processed(db: AsyncSession, transaction_id: str) -> bool:
        result = await db.execute(select(ProcessedTransaction).where(ProcessedTransaction.transaction_id == transaction_id))
        return result.scalars().first() is not None

    @staticmethod
    async def record_transaction(db: AsyncSession, tx: ProcessedTransaction) -> None:
        db.add(tx)

    @staticmethod
    async def clear_all_user_data(db: AsyncSession, user_id: UUID) -> None:
        """物理删除用户的所有关联数据，以支持账号注销"""
        # 1. 交易记录
        await db.execute(delete(ProcessedTransaction).where(ProcessedTransaction.user_id == user_id))
        # 2. 专注时段
        await db.execute(delete(FocusSession).where(FocusSession.user_id == user_id))
        # 3. 小队成员
        await db.execute(delete(SquadMember).where(SquadMember.user_id == user_id))
        # 4. 数字羁绊 (作为参与者 1 或 2)
        await db.execute(delete(Bond).where(or_(Bond.user_id_1 == user_id, Bond.user_id_2 == user_id)))
        # 5. 轻推 (作为发起者或接收者)
        await db.execute(delete(Nudge).where(or_(Nudge.sender_id == user_id, Nudge.receiver_id == user_id)))
        # 6. 举报
        await db.execute(delete(Report).where(Report.reporter_id == user_id))
        # 7. 拉黑 (作为拉黑者或被拉黑者)
        await db.execute(delete(Block).where(or_(Block.user_id == user_id, Block.blocked_id == user_id)))
        # 8. 档案
        await db.execute(delete(Profile).where(Profile.user_id == user_id))

    @staticmethod
    async def commit(db: AsyncSession) -> None:
        await db.commit()
    @staticmethod
    async def refresh(db: AsyncSession, item) -> None:
        await db.refresh(item)
