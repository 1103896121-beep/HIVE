import asyncio
import uuid
import random
from app.core.database import AsyncSessionLocal as SessionLocal, engine, Base
from app.models.user import User, Profile
from app.core.security import get_password_hash
from sqlalchemy.future import select

# 模拟地点：北京中心区域附近
LOCATIONS = [
    ("Wang Xiaoming", "Beijing", 39.9042, 116.4074, "Focusing high, seeking group."),
    ("Li Hua", "Beijing", 39.9152, 116.4034, "Mainly focusing on programming."),
    ("Zhang Wei", "Beijing", 39.9082, 116.3974, "Preparing for exams."),
    ("Zhao Min", "Shanghai", 31.2304, 121.4737, "Friends from other cities are welcome!"),
    ("Sun Wukong", "Hangzhou", 30.2741, 120.1551, "Even the Great Sage must focus."),
    ("Zhou Jie", "Beijing", 39.9042, 116.4075, "Another Wang Xiaoming on a different street."),
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
