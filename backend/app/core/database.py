from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

from app.core.config import settings

# 数据库连接配置
# 生产环境务必设置 DATABASE_URL 环境变量，使用 postgresql+asyncpg 协议
DATABASE_URL = settings.DATABASE_URL

# 对于 PostgreSQL，建议开启连接池配置
if DATABASE_URL.startswith("postgresql"):
    engine = create_async_engine(
        DATABASE_URL, 
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )
else:
    # SQLite 兼容模式
    engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
