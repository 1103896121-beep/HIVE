import asyncio
import sys
import os

# 将当前目录添加到 Python 路径，确保能导入 app 模块
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
# 导入所有模型以确保它们在 Base.metadata 中注册
from app.models.user import User, ProcessedTransaction
from app.models.social import Squad, Bond, SquadMember
from app.models.focus import FocusSession, Subject

async def init_models():
    print("Connecting to database and creating tables...")
    try:
        async with engine.begin() as conn:
            # 这里的 run_sync 会在同步上下文中执行 metadata.create_all
            await conn.run_sync(Base.metadata.create_all)
        print("Successfully initialized database tables!")
    except Exception as e:
        print(f"Error during database initialization: {e}")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(init_models())
