from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.repository.user_repository import UserRepository
from app.models.user import User

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    统一获取当前登录用户的依赖项。
    支持从 Cookie (access_token) 或 Authorization Header 中提取。
    """
    # 1. 优先尝试从 Cookie 获取 (Capacitor/Web 常用的 httponly cookie)
    token = request.cookies.get("access_token")
    
    # 2. 如果 Cookie 没有，尝试从 Header 获取 (标准的 Bearer Token)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    # 如果是 Cookie 里的 Bearer 格式，去掉前缀
    if token and token.startswith("Bearer "):
        token = token.replace("Bearer ", "")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        from uuid import UUID
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # 3. 从数据库查询用户
    user = await UserRepository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    确保用户帐号是激活状态的依赖项（目前默认为激活）。
    """
    if not getattr(current_user, "is_active", True):
        raise HTTPException(status_code=400, detail="账号已注销")
    return current_user
