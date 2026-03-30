from fastapi import APIRouter, Depends
from typing import Optional, List
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.models.user import User
from app.core.redis_client import redis_client

router = APIRouter(prefix="/presence", tags=["presence"])

class HeartbeatRequest(BaseModel):
    squad_id: Optional[str] = None

class NudgeRequest(BaseModel):
    receiver_id: str

@router.post("/heartbeat")
async def heartbeat(
    request: HeartbeatRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    接收客户端心跳，更新活跃状态，并拉取同小队在线用户和未读轻推互动。
    """
    user_id_str = str(current_user.id)
    # 1. 更新当前用户的存活标记
    await redis_client.update_presence(user_id_str, request.squad_id)
    
    # 2. 拉取自习室在线名单
    online_users = []
    if request.squad_id:
        online_users = await redis_client.get_squad_presence(request.squad_id)
        
    # 3. 拉取别人对我的轻推互动（阅后即焚）
    nudges = await redis_client.pop_nudges(user_id_str)
    
    return {
        "status": "ok",
        "online_users": online_users,
        "nudges": [{"sender_id": sender_id} for sender_id in nudges]
    }

@router.post("/nudge")
async def send_nudge(
    request: NudgeRequest,
    current_user: User = Depends(get_current_user)
):
    """
    向对方发送轻推提醒，放置于 Redis 等待对方心跳拉取。
    """
    await redis_client.send_nudge(str(current_user.id), request.receiver_id)
    return {"status": "ok", "message": "Nudge sent"}

@router.get("/stats")
async def get_global_stats():
    """
    获取 Hive 全球实时统计数据。
    """
    from app.services.social import SocialService
    from app.core.database import AsyncSessionLocal
    
    # 1. 在线人数 (来自 Redis)
    total_online = await redis_client.get_global_presence_count()
    
    # 2. 活跃战队与累计星火 (来自 DB)
    async with AsyncSessionLocal() as db:
        stats = await SocialService.get_global_stats(db)
    
    return {
        "total_online": total_online,
        "active_hives": stats["active_hives"],
        "total_sparks_today": stats["total_sparks_today"]
    }
