from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware
from app.api import user, focus, social, socket, subscription, auth
from app.core.database import engine, Base
from app.core.exceptions import HiveException
from fastapi.responses import JSONResponse
from app.models.user import User
from app.models.social import Squad, SquadMember, Bond, Nudge
from app.models.focus import Subject, FocusSession
import logging
from logging.handlers import RotatingFileHandler
import traceback
import asyncio
from datetime import datetime
from app.core.websocket import manager

# 配置标准日志系统
logger = logging.getLogger("hive")
logger.setLevel(logging.INFO)
file_handler = RotatingFileHandler("hive.log", maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# 配置限流器 (Rate Limiting)
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title="Hive API",
    description="Real-time immersion study companion platform backend",
    version="1.0.0"
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(HiveException)
async def hive_exception_handler(request: Request, exc: HiveException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "error_code": exc.__class__.__name__},
    )

# 异常记录中间件 (重构为使用标准 logging)
@app.middleware("http")
async def log_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception at {request.url.path}: {str(e)}")
        logger.error(traceback.format_exc())
        raise e

# CORS 配置
# ... rest of file

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
app.include_router(subscription.router)
app.include_router(auth.router)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 启动 WebSocket 心跳检测任务 (每 30 秒一次)
    async def heartbeat_loop():
        while True:
            await manager.ping_all()
            await asyncio.sleep(30)
    
    asyncio.create_task(heartbeat_loop())

@app.get("/")
async def root():
    return {"message": "Welcome to Hive API", "status": "online"}
