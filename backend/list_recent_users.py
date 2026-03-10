import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User
from sqlalchemy import select, desc

async def list_recent_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User.id, User.email).order_by(desc(User.created_at)).limit(5))
        users = result.all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}")

if __name__ == "__main__":
    asyncio.run(list_recent_users())
