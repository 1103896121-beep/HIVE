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
    
    # CORS 配置 — 支持 JSON 数组格式或逗号分隔格式
    @staticmethod
    def _parse_cors_origins() -> list[str]:
        """兼容解析 CORS_ORIGINS 环境变量，支持 JSON 数组和逗号分隔两种格式"""
        import json
        raw = os.getenv("CORS_ORIGINS", "")
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "capacitor://localhost",
            "https://localhost",
        ]
        if not raw:
            return defaults
        # 尝试 JSON 数组解析（如 '["http://...", "capacitor://..."]'）
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [o.strip() for o in parsed if o.strip()]
        except (json.JSONDecodeError, TypeError):
            pass
        # 降级为逗号分隔解析
        return [o.strip() for o in raw.split(",") if o.strip()]

    CORS_ORIGINS: List[str] = _parse_cors_origins()
    
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
