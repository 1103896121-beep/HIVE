from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# 数据库连接配置 (默认使用 SQLite 进行原型开发，生产环境可切换为 PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./hive.db")

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
