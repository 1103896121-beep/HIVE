from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Profile
from app.models.social import Block
from app.schemas.user import UserCreate, ProfileUpdate
from uuid import UUID
import math
from sqlalchemy import or_, and_

class UserService:
    @staticmethod
    async def get_user(db: AsyncSession, user_id: UUID):
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: UUID):
        result = await db.execute(
            select(Profile, User.trial_start_at, User.subscription_end_at)
            .join(User, Profile.user_id == User.id)
            .where(Profile.user_id == user_id)
        )
        row = result.first()
        if not row:
            return None
        
        profile, trial_start, sub_end = row
        # Manually attach attributes for the schema to pick up
        profile.trial_start_at = trial_start
        profile.subscription_end_at = sub_end
        return profile

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

    @staticmethod
    async def search_users(db: AsyncSession, query: str, current_user_id: UUID, lat: float = None, lon: float = None):
        search_pattern = f"%{query}%"
        
        # 1. 查找黑名单记录 (双向)
        block_query = await db.execute(
            select(Block.blocked_id).where(Block.user_id == current_user_id)
        )
        blocked_by_me = [r[0] for r in block_query.all()]
        
        blocker_query = await db.execute(
            select(Block.user_id).where(Block.blocked_id == current_user_id)
        )
        blocked_me = [r[0] for r in blocker_query.all()]
        
        exclude_ids = set(blocked_by_me + blocked_me + [current_user_id])

        # 2. 执行搜索
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
        users = result.all()
        
        # 3. 如果提供了经纬度，进行排序
        user_list = []
        for u in users:
            user_data = {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "avatar_url": u.avatar_url,
                "city": u.city,
                "bio": u.bio,
                "total_focus_mins": u.total_focus_mins,
                "total_sparks": u.total_sparks
            }
            
            # 计算距离 (Haversine 公式)
            dist = float('inf')
            if lat is not None and lon is not None and u.latitude is not None and u.longitude is not None:
                # 将经纬度转换为弧度
                phi1, phi2 = math.radians(lat), math.radians(u.latitude)
                dphi = math.radians(u.latitude - lat)
                dlambda = math.radians(u.longitude - lon)
                
                # Haversine 公式计算
                a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist = 6371 * c # 地球平均半径 (km)
            
            user_list.append((user_data, dist))
        
        # 按距离排序
        user_list.sort(key=lambda x: x[1])
        
        return [x[0] for x in user_list[:20]]
