from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Profile
from app.schemas.user import UserCreate, ProfileUpdate
from uuid import UUID

class UserService:
    @staticmethod
    async def get_user(db: AsyncSession, user_id: UUID):
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: UUID):
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        return result.scalars().first()

    @staticmethod
    async def update_profile(db: AsyncSession, user_id: UUID, profile_data: ProfileUpdate):
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        db_profile = result.scalars().first()
        if not db_profile:
            return None
        
        update_data = profile_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_profile, key, value)
        
        await db.commit()
        await db.refresh(db_profile)
        return db_profile

    @staticmethod
    async def increment_sparks(db: AsyncSession, user_id: UUID, sparks: int, mins: int):
        result = await db.execute(select(Profile).where(Profile.user_id == user_id))
        db_profile = result.scalars().first()
        if db_profile:
            db_profile.total_sparks += sparks
            db_profile.total_focus_mins += mins
            await db.commit()
            await db.refresh(db_profile)
        return db_profile
