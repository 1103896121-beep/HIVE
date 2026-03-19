import asyncio
from uuid import UUID
from app.core.database import AsyncSessionLocal
from app.services.social import SocialService
from app.models.social import Bond

async def test_create_bond():
    # 模拟两个存在的用户 ID (可以从数据库查，或者直接用随机值进行尝试，看是否抛出 DB 异常)
    u1 = UUID("00000000-0000-0000-0000-000000000001")
    u2 = UUID("00000000-0000-0000-0000-000000000002")
    
    async with AsyncSessionLocal() as db:
        try:
            print(f"Testing create_bond with {u1} and {u2}")
            bond = await SocialService.create_bond(db, u1, u2)
            print("Successfully created bond (or it existed)")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_create_bond())
