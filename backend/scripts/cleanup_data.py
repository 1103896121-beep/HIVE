import asyncio
import sys
import os

# 确保可以导入 app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal
from app.models.user import User, ProcessedTransaction
from sqlalchemy import delete, update

async def cleanup_user_data():
    """
    清空所有用户的订单记录，并重置会员到期时间。
    """
    async with AsyncSessionLocal() as db:
        print("[CLEANUP] Deleting all processed transactions...")
        await db.execute(delete(ProcessedTransaction))
        
        print("[CLEANUP] Resetting all user subscription end dates...")
        await db.execute(update(User).values(subscription_end_at=None))
        
        await db.commit()
        print("[CLEANUP] Success. Database is now clean for testing.")

if __name__ == "__main__":
    asyncio.run(cleanup_user_data())
