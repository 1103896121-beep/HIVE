
import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "e:/workrooten/Hive/backend"))

# Mock environment variables
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///e:/workrooten/Hive/backend/hive.db"
os.environ["SECRET_KEY"] = "test-secret-key"

from app.core.database import AsyncSessionLocal
from app.models.user import User, Profile
from app.core.security import get_password_hash, verify_password
from sqlalchemy.future import select
from sqlalchemy import text

async def verify():
    async with AsyncSessionLocal() as db:
        try:
            email = "test_verify@example.com"
            password = "testpassword123"
            name = "Verify User"
            
            # Clean up using text() to avoid ArgumentError
            await db.execute(text(f"DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = '{email}')"))
            await db.execute(text(f"DELETE FROM users WHERE email = '{email}'"))
            await db.commit()

            print("Testing password hashing...")
            hashed = get_password_hash(password)
            print(f"Hashed password: {hashed}")
            
            print("Testing password verification...")
            is_valid = verify_password(password, hashed)
            print(f"Verification result (correct password): {is_valid}")
            assert is_valid is True
            
            is_invalid = verify_password("wrongpassword", hashed)
            print(f"Verification result (wrong password): {is_invalid}")
            assert is_invalid is False

            print("Testing database integration...")
            db_user = User(
                email=email,
                hashed_password=hashed
            )
            db.add(db_user)
            await db.flush()
            
            db_profile = Profile(
                user_id=db_user.id,
                name=name
            )
            db.add(db_profile)
            await db.commit()
            print("Database transaction successful!")
            
            print("\nVERIFICATION SUCCESSFUL!")
            
        except Exception as e:
            print(f"\nVERIFICATION FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())
