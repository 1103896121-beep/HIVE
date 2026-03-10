import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import Profile

async def dump_profiles():
    async with SessionLocal() as db:
        result = await db.execute(select(Profile))
        profiles = result.scalars().all()
        for p in profiles:
            print(f"ID: {p.user_id}, Name: {p.name}, City: {p.city}, Bio: {p.bio}")

if __name__ == "__main__":
    import os
    os.environ['PYTHONPATH'] = '.'
    asyncio.run(dump_profiles())
