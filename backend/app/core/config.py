import os
from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hive API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 安全配置 — 必须通过环境变量设置，否则启动时会抛出明确异常
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # CORS 配置 — 生产环境通过环境变量 CORS_ORIGINS 设置（逗号分隔）
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    
    # 数据库
    # 优先使用环境变量 DATABASE_URL (例如: postgresql+asyncpg://user:password@localhost/dbname)
    # 本地开发默认退化为 SQLite
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./hive_v2.db"
    )
    
    # Redis 配置 (用于短连接状态长轮询与心跳)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # 邮件配置 (SMTP)
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = 587
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = "info@hiveapp.com"
    EMAILS_FROM_NAME: Optional[str] = "Hive Support"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# 启动时校验关键配置
if not settings.SECRET_KEY:
    import warnings
    warnings.warn(
        "SECRET_KEY is not set! JWT signing will fail. "
        "Set it via environment variable or backend/.env file.",
        RuntimeWarning,
        stacklevel=2
    )
