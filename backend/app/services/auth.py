import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, Profile
from app.core.security import get_password_hash, verify_password, create_access_token
from app.repository.user_repository import UserRepository
from app.core.email import send_reset_password_email
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AuthService:
    # 模拟内存存储验证码: {email: {"code": "123456", "expires": datetime}}
    _reset_codes = {}

    @staticmethod
    def get_apple_public_key(kid: str) -> RSAAlgorithm:
        url = "https://appleid.apple.com/auth/keys"
        resp = requests.get(url)
        keys = resp.json().get("keys", [])
        for key in keys:
            if key["kid"] == kid:
                return RSAAlgorithm.from_jwk(key)
        raise ValueError("Apple public key not found")

    @staticmethod
    async def apple_login(db: AsyncSession, identity_token: str, full_name: str | None = None) -> dict:
        """
        Apple 登录核心逻辑。
        支持身份验证、自动账户关联以及新用户注册流程。
        """
        try:
            header = jwt.get_unverified_header(identity_token)
            kid = header.get("kid")
            if not kid:
                raise ValueError("Invalid identity token header")
                
            public_key = AuthService.get_apple_public_key(kid)
            decoded = jwt.decode(
                identity_token,
                public_key,
                algorithms=["RS256"],
                options={"verify_aud": False} 
            )
            
            apple_sub = decoded.get("sub")
            email = decoded.get("email")
            
            if not apple_sub:
                raise ValueError("Invalid token payload")

        except Exception as e:
            raise ValueError(f"Apple token verification failed: {str(e)}")

        user = await UserRepository.get_user_by_apple_sub(db, apple_sub)
        if not user and email:
            user = await UserRepository.get_user_by_email(db, email)
            if user:
                user.apple_sub = apple_sub
                await UserRepository.commit(db)
                
        if not user:
            user = User(email=email, apple_sub=apple_sub)
            await UserRepository.create_user(db, user)
            await db.flush()
            
            display_name = full_name if full_name else (email.split('@')[0] if email else "Apple User")
            db_profile = Profile(
                user_id=user.id,
                name=display_name,
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.id}"
            )
            await UserRepository.create_profile(db, db_profile)
            await UserRepository.commit(db)

        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id)
        }

    @staticmethod
    async def register(db: AsyncSession, email: str, password: str, name: str) -> dict:
        """
        传统邮箱注册流程。
        包含密码哈希处理与默认档案创建。
        """
        try:
            if await UserRepository.get_user_by_email(db, email):
                raise ValueError("Email already registered")
            
            db_user = User(
                email=email,
                hashed_password=get_password_hash(password)
            )
            await UserRepository.create_user(db, db_user)
            await db.flush()
            
            db_profile = Profile(
                user_id=db_user.id,
                name=name,
                avatar_url=f"https://i.pravatar.cc/150?u={db_user.id}"
            )
            await UserRepository.create_profile(db, db_profile)
            await UserRepository.commit(db)
            
            access_token = create_access_token(subject=db_user.id)
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": str(db_user.id)
            }
        except Exception as e:
            logger.exception(f"Registration error: {e}")
            raise

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> dict:
        try:
            user = await UserRepository.get_user_by_email(db, email)
            
            if not user or not verify_password(password, user.hashed_password):
                raise ValueError("Incorrect email or password")
                
            access_token = create_access_token(subject=user.id)
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user_id": str(user.id)
            }
        except Exception as e:
            logger.exception(f"Login error: {e}")
            raise

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> bool:
        """
        处理忘记密码请求：生成验证码并“发送”邮件。
        """
        email = email.strip().lower()
        user = await UserRepository.get_user_by_email(db, email)
        if not user:
            logger.warning(f"Forgot password requested for non-existent email: {email}")
            return True
            
        import random
        code = f"{random.randint(100000, 999999)}"

        AuthService._reset_codes[email] = {
            "code": code,
            "expires": datetime.now() + timedelta(minutes=10)
        }
        
        logger.info(f"Reset code {code} stored for {email}. Current keys: {list(AuthService._reset_codes.keys())}")
        await send_reset_password_email(email, code)
        return True

    @staticmethod
    async def reset_password(db: AsyncSession, email: str, code: str, new_password: str) -> bool:
        """
        验证码校验并更新密码。
        """
        email = email.strip().lower()
        record = AuthService._reset_codes.get(email)
        
        if not record:
            logger.error(f"No reset record found for {email}. Available: {list(AuthService._reset_codes.keys())}")
            raise ValueError("Invalid or expired reset code")
            
        if record["code"] != code or datetime.now() > record["expires"]:
            logger.error(f"Code mismatch or expired for {email}. Expected: {record['code']}, Got: {code}")
            raise ValueError("Invalid or expired reset code")
            
        user = await UserRepository.get_user_by_email(db, email)
        if not user:
            raise ValueError("User not found")
            
        user.hashed_password = get_password_hash(new_password)
        await UserRepository.commit(db)
        
        # 清除验证码
        del AuthService._reset_codes[email]
        logger.info(f"Password reset successful for {email}")
        return True
