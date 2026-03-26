from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, Profile
from app.schemas.user import ProfileUpdate
from app.repository.user_repository import UserRepository
from uuid import UUID
import math
from app.core.security import verify_password, get_password_hash
from typing import Optional, List
import httpx
import logging

logger = logging.getLogger("app")

class UserService:
    @staticmethod
    async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
        return await UserRepository.get_user_by_id(db, user_id)

    @staticmethod
    async def get_profile(db: AsyncSession, user_id: UUID) -> Optional[dict]:
        """
        获取用户详细档案，包含试用期和订阅状态。
        通过关联 User 表获取时间戳，以确保前端能正确展示剩余天数。
        """
        row = await UserRepository.get_profile_with_trial(db, user_id)
        if not row:
            return None
        
        profile, trial_start, sub_end = row
        # Manually attach attributes for the schema to pick up
        profile.trial_start_at = trial_start
        profile.subscription_end_at = sub_end
        return profile

    @staticmethod
    async def update_profile(db: AsyncSession, user_id: UUID, profile_in: ProfileUpdate) -> Optional[dict]:
        """
        更新用户个人资料。仅允许修改展示性字段，
        确保地理坐标等敏感逻辑通过 Pydantic 校验后写入。
        """
        db_profile = await UserRepository.get_profile(db, user_id)
        if not db_profile:
            return None
        
        update_data = profile_in.dict(exclude_unset=True)
        
        # 如果提供了经纬度且城市名为空，尝试在后端进行逆编码
        if "latitude" in update_data and "longitude" in update_data and not update_data.get("city"):
            try:
                lat, lon = update_data["latitude"], update_data["longitude"]
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10",
                        headers={"User-Agent": "HiveApp/1.0"}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        address = data.get("address", {})
                        city = address.get("city") or address.get("town") or address.get("village") or address.get("state") or ""
                        db_profile.city = city
                        logger.info(f"Backend reverse geocoding success: {city}")
            except Exception as e:
                logger.error(f"Backend reverse geocoding failed: {e}")

        for key, value in update_data.items():
            setattr(db_profile, key, value)
        
        await UserRepository.commit(db)
        await UserRepository.refresh(db, db_profile)
        
        # Attach attributes for the schema to pick up (consistent with get_profile)
        # Re-fetch with join to get user trial data
        row = await UserRepository.get_profile_with_trial(db, user_id)
        if row:
            _, trial_start, sub_end = row
            db_profile.trial_start_at = trial_start
            db_profile.subscription_end_at = sub_end
            
        return db_profile

    @staticmethod
    async def update_password(db: AsyncSession, user_id: UUID, current_password: str, new_password: str, confirm_password: str) -> tuple[bool, str]:
        if new_password != confirm_password:
            return False, "Passwords do not match"
        
        user = await UserRepository.get_user_by_id(db, user_id)
        if not user:
            return False, "User not found"
        
        if not verify_password(current_password, user.hashed_password):
            return False, "Incorrect current password"
        
        user.hashed_password = get_password_hash(new_password)
        await UserRepository.commit(db)
        return True, "Password updated successfully"

    @staticmethod
    async def delete_account(db: AsyncSession, user_id: UUID) -> bool:
        # 1. 删除关联的 Profile
        profile = await UserRepository.get_profile(db, user_id)
        if profile:
            await UserRepository.delete_item(db, profile)
        
        # 2. 删除 User
        user = await UserRepository.get_user_by_id(db, user_id)
        if user:
            await UserRepository.delete_item(db, user)
        
        await UserRepository.commit(db)
        return True

    @staticmethod
    async def increment_sparks(db: AsyncSession, user_id: UUID, sparks: int, mins: int) -> Optional[Profile]:
        db_profile = await UserRepository.get_profile(db, user_id)
        if db_profile:
            db_profile.total_sparks += sparks
            db_profile.total_focus_mins += mins
            await UserRepository.commit(db)
            await UserRepository.refresh(db, db_profile)
        return db_profile

    @staticmethod
    async def search_users(db: AsyncSession, query: str, current_user_id: UUID, lat: float = None, lon: float = None) -> List[dict]:
        search_pattern = f"%{query}%"
        
        # 1. 查找黑名单记录 (使用 Repository)
        blocked_by_me, blocked_me = await UserRepository.get_block_ids(db, current_user_id)
        exclude_ids = set(list(blocked_by_me) + list(blocked_me) + [current_user_id])

        # 2. 执行搜索 (使用 Repository)
        users = await UserRepository.search_profiles(db, search_pattern, exclude_ids)
        
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
                phi1, phi2 = math.radians(lat), math.radians(u.latitude)
                dphi = math.radians(u.latitude - lat)
                dlambda = math.radians(u.longitude - lon)
                
                a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist = 6371 * c # 地球平均半径 (km)
            
            user_list.append((user_data, dist))
        
        user_list.sort(key=lambda x: x[1])
        return [x[0] for x in user_list[:20]]
