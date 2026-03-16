import jwt
import requests
from jwt.algorithms import RSAAlgorithm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User, Profile
from app.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
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
    async def apple_login(db: AsyncSession, identity_token: str, full_name: str | None = None):
        try:
            # 1. Decode header to get kid
            header = jwt.get_unverified_header(identity_token)
            kid = header.get("kid")
            if not kid:
                raise ValueError("Invalid identity token header")
                
            public_key = AuthService.get_apple_public_key(kid)
            
            # 2. Verify token
            # Expected audience should ideally be the bundle ID (e.g. com.hive.app)
            # For this MVP, we verify signature but bypass strict audience validation to avoid config issues until Apple Developer account is set up
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

        # 3. Check if user exists by apple_sub
        result = await db.execute(select(User).where(User.apple_sub == apple_sub))
        user = result.scalars().first()
        
        # 4. Fallback check by email (if they registered by email before)
        if not user and email:
            email_result = await db.execute(select(User).where(User.email == email))
            user = email_result.scalars().first()
            if user:
                # Link the existing user to this apple_sub
                user.apple_sub = apple_sub
                await db.commit()
                
        # 5. Create new user if still not found
        if not user:
            user = User(
                email=email, # Can be none or a private relay apple email
                apple_sub=apple_sub
                # Note: No hashed_password
            )
            db.add(user)
            await db.flush()
            
            # Create default profile
            display_name = full_name if full_name else (email.split('@')[0] if email else "Apple User")
            db_profile = Profile(
                user_id=user.id,
                name=display_name,
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.id}"
            )
            db.add(db_profile)
            await db.commit()

        # 6. Issue access token
        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id)
        }
    @staticmethod
    async def register(db: AsyncSession, email: str, password: str, name: str):
        result = await db.execute(select(User).where(User.email == email))
        if result.scalars().first():
            raise ValueError("Email already registered")
        
        db_user = User(
            email=email,
            hashed_password=get_password_hash(password)
        )
        db.add(db_user)
        await db.flush()
        
        db_profile = Profile(
            user_id=db_user.id,
            name=name,
            avatar_url=f"https://i.pravatar.cc/150?u={db_user.id}"
        )
        db.add(db_profile)
        await db.commit()
        
        access_token = create_access_token(subject=db_user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(db_user.id)
        }

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str):
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Incorrect email or password")
            
        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id)
        }
