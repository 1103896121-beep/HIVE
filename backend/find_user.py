import asyncio
from app.core.database import AsyncSessionLocal as SessionLocal
from app.models.user import User
from sqlalchemy import select

import sys

async def find_user(email: str):
    async with SessionLocal() as db:
        result = await db.execute(select(User.id, User.email).where(User.email == email))
        user = result.first()
        if user:
            print(f"FOUND: ID: {user.id}, Email: {user.email}")
        else:
            print(f"NOT FOUND: {email}")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'david@example.com'
    asyncio.run(find_user(email))
