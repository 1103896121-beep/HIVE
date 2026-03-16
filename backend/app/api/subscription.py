from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.subscription import SubscriptionService
from uuid import UUID
from pydantic import BaseModel

router = APIRouter(prefix="/subscription", tags=["subscription"])

class SubscribeRequest(BaseModel):
    user_id: UUID
    plan: str # "monthly" or "yearly"

class ReceiptValidationRequest(BaseModel):
    user_id: UUID
    receipt_data: str

@router.post("/verify-receipt")
async def verify_receipt(req: ReceiptValidationRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await SubscriptionService.verify_apple_receipt(db, req.user_id, req.receipt_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/subscribe")
async def subscribe(req: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await SubscriptionService.subscribe(db, req.user_id, req.plan)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
