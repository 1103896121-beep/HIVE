import asyncio
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import Profile

async def fix_missing_cities():
    async with SessionLocal() as db:
        # Get all profiles with missing city
        result = await db.execute(select(Profile).where(Profile.city == None))
        profiles = result.scalars().all()
        
        cities = ["Beijing", "Shanghai", "London", "Tokyo", "New York"]
        
        for p in profiles:
            p.city = cities[hash(p.user_id) % len(cities)]
            print(f"Updating user {p.user_id} ({p.name}) with city {p.city}")
            
        await db.commit()
    print("Database fix complete.")

if __name__ == "__main__":
    import os
    os.environ['PYTHONPATH'] = '.'
    asyncio.run(fix_missing_cities())
