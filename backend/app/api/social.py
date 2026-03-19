from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.validator import validate_content
from app.schemas.social import SquadResponse, SquadCreate, BondResponse, BondEnrichedResponse, ReportResponse, ReportCreate, BlockResponse, BlockCreate, HiveMatchingResponse
from app.services.social import SocialService
from app.api.deps import get_current_active_user
from app.models.user import User
from uuid import UUID
from typing import List

router = APIRouter(prefix="/social", tags=["social"])

@router.post("/squads", response_model=SquadResponse)
async def create_squad(
    squad_in: SquadCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not validate_content(squad_in.name):
        raise HTTPException(status_code=400, detail="Squad name contains inappropriate content")
    try:
        return await SocialService.create_squad(db, current_user.id, squad_in)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/{squad_id}/invite")
async def invite_to_squad(
    squad_id: UUID, 
    user_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await SocialService.invite_to_squad(db, current_user.id, user_id, squad_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/squads/{squad_id}/invitations/review")
async def review_invitation(
    squad_id: UUID, 
    accept: bool, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await SocialService.review_invitation(db, current_user.id, squad_id, accept)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/squads/{squad_id}/leave")
async def leave_squad(
    squad_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        await SocialService.leave_squad(db, current_user.id, squad_id)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/squads/{squad_id}")
async def disband_squad(
    squad_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        await SocialService.disband_squad(db, current_user.id, squad_id)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bonds", response_model=BondResponse)
async def create_bond(
    user_id_2: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        return await SocialService.create_bond(db, current_user.id, user_id_2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/bonds/{target_id}")
async def remove_bond(
    target_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    success = await SocialService.remove_bond(db, current_user.id, target_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bond not found")
    return {"status": "success"}

@router.patch("/bonds/status", response_model=BondResponse)
async def update_bond_status(
    user_id_2: UUID, 
    status: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    bond = await SocialService.update_bond_status(db, current_user.id, user_id_2, status)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    return bond

@router.get("/squads", response_model=List[SquadResponse])
async def get_my_squads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await SocialService.get_user_squads(db, current_user.id)

@router.get("/bonds", response_model=List[BondEnrichedResponse])
async def get_my_bonds(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await SocialService.get_user_bonds(db, current_user.id)

@router.post("/reports", response_model=ReportResponse)
async def create_report(
    report_in: ReportCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await SocialService.create_report(db, current_user.id, report_in)

@router.post("/blocks", response_model=BlockResponse)
async def block_user(
    block_in: BlockCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await SocialService.block_user(db, current_user.id, block_in)

@router.get("/hive/matching", response_model=HiveMatchingResponse)
async def get_hive_matching(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return await SocialService.get_hive_matching(db, current_user.id)
