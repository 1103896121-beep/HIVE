import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User
from sqlalchemy import select

async def find_first_user():
    async with SessionLocal() as db:
        result = await db.execute(select(User.id, User.email).order_by(User.created_at))
        user = result.first()
        if user:
            print(f"Oldest user ID: {user.id}, Email: {user.email}")
        else:
            print("No users found")

if __name__ == "__main__":
    asyncio.run(find_first_user())
