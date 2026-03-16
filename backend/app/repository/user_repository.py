from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Profile
from app.models.social import Block
from uuid import UUID
from typing import Optional, List, Tuple
from sqlalchemy import or_, and_

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
                    User.id.not_in(exclude_ids)
                )
            )
            .limit(50)
        )
        result = await db.execute(stmt)
        return result.all()
    @staticmethod
    async def commit(db: AsyncSession) -> None:
        await db.commit()
    @staticmethod
    async def refresh(db: AsyncSession, item) -> None:
        await db.refresh(item)
