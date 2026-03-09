from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.social import SquadResponse, SquadCreate, BondResponse, ReportResponse, ReportCreate, BlockResponse, BlockCreate
from app.services.social import SocialService
from uuid import UUID
from typing import List

router = APIRouter(prefix="/social", tags=["social"])

@router.post("/squads", response_model=SquadResponse)
async def create_squad(squad_in: SquadCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.create_squad(db, user_id, squad_in)

@router.post("/squads/join", response_model=SquadResponse)
async def join_squad(invite_code: str, user_id: UUID, db: AsyncSession = Depends(get_db)):
    squad = await SocialService.join_squad(db, user_id, invite_code)
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    return squad

@router.post("/bonds", response_model=BondResponse)
async def create_bond(user_id_2: UUID, user_id_1: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.create_bond(db, user_id_1, user_id_2)

@router.patch("/bonds/status", response_model=BondResponse)
async def update_bond_status(user_id_1: UUID, user_id_2: UUID, status: str, db: AsyncSession = Depends(get_db)):
    bond = await SocialService.update_bond_status(db, user_id_1, user_id_2, status)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    return bond

@router.get("/squads/{user_id}", response_model=List[SquadResponse])
async def get_user_squads(user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.get_user_squads(db, user_id)

@router.get("/bonds/{user_id}", response_model=List[BondResponse])
async def get_user_bonds(user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.get_user_bonds(db, user_id)

@router.post("/reports", response_model=ReportResponse)
async def create_report(report_in: ReportCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.create_report(db, user_id, report_in)

@router.post("/blocks", response_model=BlockResponse)
async def block_user(block_in: BlockCreate, user_id: UUID, db: AsyncSession = Depends(get_db)):
    return await SocialService.block_user(db, user_id, block_in)
