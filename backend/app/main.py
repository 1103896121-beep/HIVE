from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware
from app.api import user, focus, social, socket
from app.core.database import engine, Base
from app.models.user import User
from app.models.social import Squad, SquadMember, Bond, Nudge
from app.models.focus import Subject, FocusSession

# 配置限流器 (Rate Limiting)
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Hive API",
    description="Real-time immersion study companion platform backend",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(user.router)
app.include_router(focus.router)
app.include_router(social.router)
app.include_router(socket.router)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Welcome to Hive API", "status": "online"}
