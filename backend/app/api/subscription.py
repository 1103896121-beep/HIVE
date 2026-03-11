from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/subscription", tags=["subscription"])

class SubscribeRequest(BaseModel):
    user_id: UUID
    plan: str # "monthly" or "yearly"

@router.post("/subscribe")
async def subscribe(req: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == req.user_id))
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User found")
    
    user = db_user # 保持后续逻辑中的 user 变量名
    
    # 定义时长映射 (天)
    PLAN_DURATION = {
        "monthly": 31,
        "quarterly": 92,
        "yearly": 366,
        "lifetime": 36500 # 100年视为买断
    }
    
    if req.plan not in PLAN_DURATION:
        raise HTTPException(status_code=400, detail="Invalid plan type")
        
    days = PLAN_DURATION[req.plan]
    
    # 计算新的过期时间
    current_expiry = user.subscription_end_at if user.subscription_end_at and user.subscription_end_at > datetime.utcnow() else datetime.utcnow()
    user.subscription_end_at = current_expiry + timedelta(days=days)
    
    await db.commit()
    return {"status": "success", "expires_at": user.subscription_end_at}
