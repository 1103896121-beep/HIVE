import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User
from sqlalchemy import select

async def find_user():
    async with SessionLocal() as db:
        result = await db.execute(select(User.id, User.email).where(User.email == 'david@example.com'))
        user = result.first()
        if user:
            print(f"ID: {user.id}, Email: {user.email}")
        else:
            print("User not found")

if __name__ == "__main__":
    asyncio.run(find_user())
