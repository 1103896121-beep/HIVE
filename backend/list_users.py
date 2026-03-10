import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User

async def list_users():
    async with SessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(User.id, User.email))
        users = result.all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}")

if __name__ == "__main__":
    asyncio.run(list_users())
