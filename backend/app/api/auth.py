from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.validator import validate_content
from app.services.auth import AuthService
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user_id: str
    message: str = "success"

class AppleLogin(BaseModel):
    identity_token: str
    full_name: str | None = None

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    await AuthService.forgot_password(db, data.email)
    return {"status": "ok", "message": "Reset code sent if email exists"}

@router.post("/reset-password")
async def reset_password(data: ResetPassword, db: AsyncSession = Depends(get_db)):
    try:
        await AuthService.reset_password(db, data.email, data.code, data.new_password)
        return {"status": "ok", "message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/apple", response_model=LoginResponse)
async def apple_login(apple_in: AppleLogin, response: Response, db: AsyncSession = Depends(get_db)):
    try:
        res = await AuthService.apple_login(db, apple_in.identity_token, apple_in.full_name)
        response.set_cookie(
            key="access_token",
            value=f"Bearer {res['access_token']}",
            httponly=True,
            samesite="lax",
            max_age=60*24*7*60
        )
        return {"user_id": res["user_id"]}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register", response_model=LoginResponse)
async def register(user_in: UserRegister, response: Response, db: AsyncSession = Depends(get_db)):
    if not validate_content(user_in.name):
        raise HTTPException(status_code=400, detail="Name contains inappropriate content")
    try:
        res = await AuthService.register(db, user_in.email, user_in.password, user_in.name)
        response.set_cookie(
            key="access_token",
            value=f"Bearer {res['access_token']}",
            httponly=True,
            samesite="lax",
            max_age=60*24*7*60
        )
        return {"user_id": res["user_id"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=LoginResponse)
async def login(user_in: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    try:
        res = await AuthService.login(db, user_in.email, user_in.password)
        response.set_cookie(
            key="access_token",
            value=f"Bearer {res['access_token']}",
            httponly=True,
            samesite="lax",
            max_age=60*24*7*60
        )
        return {"user_id": res["user_id"]}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
