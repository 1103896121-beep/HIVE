from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hive API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 安全配置
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_FOR_JWT_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # 数据库
    DATABASE_URL: str = "sqlite+aiosqlite:///./hive.db"
    
    # Redis (用于实时 Presence)
    REDIS_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
