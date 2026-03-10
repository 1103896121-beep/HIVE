import asyncio
import uuid
import random
from app.core.database import AsyncSessionLocal as SessionLocal, engine, Base
from app.models.user import User, Profile
from app.core.security import get_password_hash
from sqlalchemy.future import select

# 模拟地点：北京中心区域附近
LOCATIONS = [
    ("王小明", "北京", 39.9042, 116.4074, "专注力挺高的，求带。"),
    ("李华", "北京", 39.9152, 116.4034, "主要专注编程学习。"),
    ("张伟", "北京", 39.9082, 116.3974, "考研复习中。"),
    ("赵敏", "上海", 31.2304, 121.4737, "跨城的朋友也可以一起！"),
    ("孙悟空", "杭州", 30.2741, 120.1551, "大圣也要专注。"),
    ("周杰", "北京", 39.9042, 116.4075, "同名王小明，我在另外一条街。"),
]

async def seed():
    async with SessionLocal() as db:
        hashed_pw = get_password_hash("password123")
        
        for name, city, lat, lon, bio in LOCATIONS:
            email = f"{uuid.uuid4().hex[:8]}@example.com"
            user = User(email=email, hashed_password=hashed_pw)
            db.add(user)
            await db.flush()
            
            profile = Profile(
                user_id=user.id,
                name=name,
                city=city,
                latitude=lat,
                longitude=lon,
                bio=bio,
                avatar_url=f"https://i.pravatar.cc/150?u={user.id}",
                total_focus_mins=random.randint(100, 5000),
                total_sparks=random.randint(10, 500)
            )
            db.add(profile)
            
        await db.commit()
    print(f"Successfully seeded {len(LOCATIONS)} test users.")

if __name__ == "__main__":
    asyncio.run(seed())
