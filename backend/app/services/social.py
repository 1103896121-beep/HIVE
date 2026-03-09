from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.social import Squad, SquadMember, Bond, Nudge, Report, Block
from app.schemas.social import SquadCreate, ReportCreate, BlockCreate
import uuid
import random
import string
from uuid import UUID

class SocialService:
    @staticmethod
    def generate_invite_code():
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    @staticmethod
    async def create_squad(db: AsyncSession, user_id: UUID, squad_in: SquadCreate):
        db_squad = Squad(
            name=squad_in.name,
            is_private=squad_in.is_private,
            invite_code=SocialService.generate_invite_code(),
            created_by=user_id
        )
        db.add(db_squad)
        await db.flush() # 获取 ID
        
        # 自动加入创建者
        member = SquadMember(squad_id=db_squad.id, user_id=user_id, role="ADMIN")
        db.add(member)
        
        await db.commit()
        await db.refresh(db_squad)
        return db_squad

    @staticmethod
    async def join_squad(db: AsyncSession, user_id: UUID, invite_code: str):
        result = await db.execute(select(Squad).where(Squad.invite_code == invite_code))
        db_squad = result.scalars().first()
        if not db_squad:
            return None
        
        # 检查是否已在小队中
        member_check = await db.execute(
            select(SquadMember).where(SquadMember.squad_id == db_squad.id, SquadMember.user_id == user_id)
        )
        if member_check.scalars().first():
            return db_squad
            
        member = SquadMember(squad_id=db_squad.id, user_id=user_id)
        db.add(member)
        await db.commit()
        return db_squad

    @staticmethod
    async def create_bond(db: AsyncSession, user_id_1: UUID, user_id_2: UUID):
        # 排序 ID 以确保唯一性
        u1, u2 = sorted([user_id_1, user_id_2])
        db_bond = Bond(user_id_1=u1, user_id_2=u2, status="PENDING")
        db.add(db_bond)
        await db.commit()
        await db.refresh(db_bond)
        return db_bond

    @staticmethod
    async def update_bond_status(db: AsyncSession, user_id_1: UUID, user_id_2: UUID, status: str):
        u1, u2 = sorted([user_id_1, user_id_2])
        result = await db.execute(select(Bond).where(Bond.user_id_1 == u1, Bond.user_id_2 == u2))
        db_bond = result.scalars().first()
        if db_bond:
            db_bond.status = status
            await db.commit()
            await db.refresh(db_bond)
        return db_bond

    @staticmethod
    async def get_user_squads(db: AsyncSession, user_id: UUID):
        # 查找用户加入的所有小队
        result = await db.execute(
            select(Squad)
            .join(SquadMember)
            .where(SquadMember.user_id == user_id)
        )
        return result.scalars().all()

    @staticmethod
    async def get_user_bonds(db: AsyncSession, user_id: UUID):
        # 查找与该用户相关的所有羁绊（无论作为 user_id_1 还是 user_id_2）
        result = await db.execute(
            select(Bond).where((Bond.user_id_1 == user_id) | (Bond.user_id_2 == user_id))
        )
        return result.scalars().all()

    @staticmethod
    async def create_report(db: AsyncSession, user_id: UUID, report_in: ReportCreate):
        db_report = Report(
            reporter_id=user_id,
            target_id=report_in.target_id,
            target_type=report_in.target_type,
            reason=report_in.reason
        )
        db.add(db_report)
        await db.commit()
        await db.refresh(db_report)
        return db_report

    @staticmethod
    async def block_user(db: AsyncSession, user_id: UUID, block_in: BlockCreate):
        db_block = Block(
            user_id=user_id,
            blocked_id=block_in.blocked_id
        )
        db.add(db_block)
        await db.commit()
        await db.refresh(db_block)
        return db_block
