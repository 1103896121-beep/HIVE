
import asyncio
import os
import sys
import bcrypt

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "e:/workrooten/Hive/backend"))

# Mock environment variables
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///e:/workrooten/Hive/backend/hive.db"
os.environ["SECRET_KEY"] = "test-secret-key"

from app.core.database import AsyncSessionLocal, Base, engine
from app.models.user import User, Profile
from sqlalchemy.future import select

# Mock versions of the security functions to test the fix
def get_password_hash_fixed(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def reproduce():
    async with AsyncSessionLocal() as db:
        try:
            email = "test_repro_fix@example.com"
            password = "testpassword"
            name = "Test User"
            
            # Clean up
            await db.execute(f"DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = '{email}')")
            await db.execute(f"DELETE FROM users WHERE email = '{email}'")
            await db.commit()

            print("Starting registration with FIXED hashing...")
            
            db_user = User(
                email=email,
                hashed_password=get_password_hash_fixed(password)
            )
            db.add(db_user)
            await db.flush()
            print(f"User created with ID: {db_user.id}")
            
            db_profile = Profile(
                user_id=db_user.id,
                name=name,
                avatar_url=f"https://i.pravatar.cc/150?u={db_user.id}"
            )
            db.add(db_profile)
            await db.commit()
            print("Registration with FIXED hashing successful!")
            
        except Exception as e:
            print(f"Caught exception: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())
