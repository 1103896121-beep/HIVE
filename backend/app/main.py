from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.models import * # 必须导入所有模型以注册到 Base.metadata

app = FastAPI(
    title="Hive API",
    description="Real-time immersion study companion platform backend",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 这里的限制可根据实际前端域名调整
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    # 启动时自动创建数据库表 (仅限开发环境)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Welcome to Hive API", "status": "online"}
