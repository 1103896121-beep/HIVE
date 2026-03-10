import asyncio
import uuid
import random
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User, Profile
from app.models.social import Bond
from app.core.security import get_password_hash
from sqlalchemy.future import select

async def seed_many_bonds():
    # Target User ID from the conversation context (david)
    target_user_id = UUID("8750b191-6d30-4c1c-a05d-1f97b86f38fd")
    
    async with SessionLocal() as db:
        hashed_pw = get_password_hash("password123")
        
        cities = ["Beijing", "Shanghai", "Tokyo", "London", "New York", "Paris", "Berlin"]
        statuses = ["ACCEPTED", "PENDING"]
        
        print(f"Seeding 20 bonds for user {target_user_id}...")
        
        for i in range(20):
            email = f"friend_{i}_{uuid.uuid4().hex[:4]}@example.com"
            user = User(email=email, hashed_password=hashed_pw)
            db.add(user)
            await db.flush()
            
            profile = Profile(
                user_id=user.id,
                name=f"Friend {i+1}",
                city=random.choice(cities),
                avatar_url=f"https://i.pravatar.cc/150?u={user.id}",
                bio=f"Always focusing on goal #{i+1}!",
                total_focus_mins=random.randint(500, 10000),
                total_sparks=random.randint(50, 1000)
            )
            db.add(profile)
            
            # Create a bond with david
            bond = Bond(
                user_id_1=target_user_id,
                user_id_2=user.id,
                status=random.choice(statuses)
            )
            db.add(bond)
            
        await db.commit()
    print("Successfully seeded 20 new friends.")

if __name__ == "__main__":
    from uuid import UUID
    import os
    os.environ['PYTHONPATH'] = '.'
    asyncio.run(seed_many_bonds())
