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
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    days = 31 if req.plan == "monthly" else 366
    
    # Calculate new expiry date
    current_expiry = user.subscription_end_at if user.subscription_end_at and user.subscription_end_at > datetime.utcnow() else datetime.utcnow()
    user.subscription_end_at = current_expiry + timedelta(days=days)
    
    await db.commit()
    return {"status": "success", "expires_at": user.subscription_end_at}
