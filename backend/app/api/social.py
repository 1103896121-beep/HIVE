from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.social import SquadResponse, SquadCreate, BondResponse, BondEnrichedResponse, ReportResponse, ReportCreate, BlockResponse, BlockCreate
from app.services.social import SocialService
from uuid import UUID
from typing import List

router = APIRouter(prefix="/social", tags=["social"])

@router.post("/squads", response_model=SquadResponse)
async def create_squad(squad_in: SquadCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await SocialService.create_squad(db, user_id, squad_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/{squad_id}/invite")
async def invite_to_squad(squad_id: UUID, admin_id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await SocialService.invite_to_squad(db, admin_id, user_id, squad_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/{squad_id}/invitations/review")
async def review_invitation(squad_id: UUID, user_id: UUID, accept: bool, db: AsyncSession = Depends(get_db)):
    try:
        return await SocialService.review_invitation(db, user_id, squad_id, accept)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/squads/{squad_id}/leave")
async def leave_squad(squad_id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        await SocialService.leave_squad(db, user_id, squad_id)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/squads/{squad_id}")
async def disband_squad(squad_id: UUID, admin_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        await SocialService.disband_squad(db, admin_id, squad_id)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bonds", response_model=BondResponse)
async def create_bond(user_id_2: UUID, user_id_1: UUID, db: AsyncSession = Depends(get_db)):
    try:
        return await SocialService.create_bond(db, user_id_1, user_id_2)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/bonds/{target_id}")
async def remove_bond(target_id: UUID, user_id: UUID, db: AsyncSession = Depends(get_db)):
    success = await SocialService.remove_bond(db, user_id, target_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bond not found")
    return {"status": "success"}

@router.patch("/bonds/status", response_model=BondResponse)
async def update_bond_status(user_id_1: UUID, user_id_2: UUID, status: str, db: AsyncSession = Depends(get_db)):
    bond = await SocialService.update_bond_status(db, user_id_1, user_id_2, status)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    return bond

@router.get("/squads/{user_id}", response_model=List[SquadResponse])
async def get_user_squads(user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.get_user_squads(db, user_id)

@router.get("/bonds/{user_id}", response_model=List[BondEnrichedResponse])
async def get_user_bonds(user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.get_user_bonds(db, user_id)

@router.post("/reports", response_model=ReportResponse)
async def create_report(report_in: ReportCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.create_report(db, user_id, report_in)

@router.post("/blocks", response_model=BlockResponse)
async def block_user(block_in: BlockCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.block_user(db, user_id, block_in)
