import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.focus import Subject
from app.core.database import DATABASE_URL

async def check():
    engine = create_async_engine(DATABASE_URL.replace("sqlite+aiosqlite:///", "sqlite+aiosqlite:///e:/workrooten/Hive/backend/"))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(select(Subject))
        subjects = result.scalars().all()
        print(f"Verification - Current subjects: {[s.name for s in subjects]}")

if __name__ == "__main__":
    asyncio.run(check())
