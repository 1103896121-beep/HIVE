from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.subscription import SubscriptionService
from app.api.deps import get_current_active_user
from app.models.user import User
from uuid import UUID
from pydantic import BaseModel

router = APIRouter(prefix="/subscription", tags=["subscription"])

class SubscribeRequest(BaseModel):
    plan: str # "monthly" or "yearly"

class ReceiptValidationRequest(BaseModel):
    receipt_data: str

@router.post("/verify-receipt")
async def verify_receipt(
    req: ReceiptValidationRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await SubscriptionService.verify_apple_receipt(db, current_user.id, req.receipt_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/subscribe")
async def subscribe(
    req: SubscribeRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await SubscriptionService.subscribe(db, current_user.id, req.plan)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
