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
    async def _check_user_in_squad(db: AsyncSession, user_id: UUID) -> bool:
        # Check if user is already an ACTIVE member of any squad
        result = await db.execute(select(SquadMember).where(SquadMember.user_id == user_id, SquadMember.status == "ACTIVE"))
        return result.scalars().first() is not None

    @staticmethod
    async def create_squad(db: AsyncSession, user_id: UUID, squad_in: SquadCreate):
        if await SocialService._check_user_in_squad(db, user_id):
            raise ValueError("User is already in an active squad.")

        db_squad = Squad(
            name=squad_in.name,
            is_private=squad_in.is_private,
            created_by=user_id
        )
        db.add(db_squad)
        await db.flush() # 获取 ID
        
        # 自动加入创建者
        member = SquadMember(squad_id=db_squad.id, user_id=user_id, role="ADMIN", status="ACTIVE")
        db.add(member)
        
        await db.commit()
        await db.refresh(db_squad)
        return db_squad

    @staticmethod
    async def apply_to_squad(db: AsyncSession, user_id: UUID, squad_id: UUID):
        if await SocialService._check_user_in_squad(db, user_id):
            raise ValueError("User is already in an active squad.")
            
        result = await db.execute(select(Squad).where(Squad.id == squad_id))
        squad = result.scalars().first()
        if not squad:
            raise ValueError("Squad not found.")

        # Check existing membership
        member_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id))
        existing = member_check.scalars().first()
        if existing:
            return existing

        member = SquadMember(squad_id=squad_id, user_id=user_id, status="PENDING_APPROVAL")
        db.add(member)
        await db.commit()
        return member

    @staticmethod
    async def invite_to_squad(db: AsyncSession, admin_id: UUID, user_id: UUID, squad_id: UUID):
        # Verify admin
        admin_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == admin_id, SquadMember.role == "ADMIN", SquadMember.status == "ACTIVE"))
        if not admin_check.scalars().first():
            raise ValueError("Only an active admin can invite.")

        # Check existing membership
        member_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id))
        existing = member_check.scalars().first()
        if existing:
            return existing

        member = SquadMember(squad_id=squad_id, user_id=user_id, status="PENDING_INVITE")
        db.add(member)
        await db.commit()
        return member

    @staticmethod
    async def review_application(db: AsyncSession, admin_id: UUID, user_id: UUID, squad_id: UUID, approve: bool):
        # Verify admin
        admin_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == admin_id, SquadMember.role == "ADMIN", SquadMember.status == "ACTIVE"))
        if not admin_check.scalars().first():
            raise ValueError("Only an active admin can review applications.")

        member_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id, SquadMember.status == "PENDING_APPROVAL"))
        member = member_check.scalars().first()
        if not member:
            raise ValueError("Application not found.")

        if approve:
            if await SocialService._check_user_in_squad(db, user_id):
                db.delete(member) # Reject automatically if they joined another squad
                await db.commit()
                raise ValueError("User has already joined another squad.")
            member.status = "ACTIVE"
        else:
            db.delete(member)
        
        await db.commit()
        return member if approve else None

    @staticmethod
    async def review_invitation(db: AsyncSession, user_id: UUID, squad_id: UUID, accept: bool):
        member_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id, SquadMember.status == "PENDING_INVITE"))
        member = member_check.scalars().first()
        if not member:
            raise ValueError("Invitation not found.")

        if accept:
            if await SocialService._check_user_in_squad(db, user_id):
                raise ValueError("You are already in an active squad.")
            member.status = "ACTIVE"
        else:
            db.delete(member)
        
        await db.commit()
        return member if accept else None

    @staticmethod
    async def leave_squad(db: AsyncSession, user_id: UUID, squad_id: UUID):
        member_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id))
        member = member_check.scalars().first()
        if not member:
            raise ValueError("Member not found in squad.")
        
        if member.role == "ADMIN":
            raise ValueError("Creator cannot leave the squad. Disband it instead.")

        db.delete(member)
        await db.commit()
        return True

    @staticmethod
    async def disband_squad(db: AsyncSession, admin_id: UUID, squad_id: UUID):
        admin_check = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == admin_id, SquadMember.role == "ADMIN", SquadMember.status == "ACTIVE"))
        if not admin_check.scalars().first():
            raise ValueError("Only an active admin can disband the squad.")

        await db.execute(SquadMember.__table__.delete().where(SquadMember.squad_id == squad_id))
        result = await db.execute(select(Squad).where(Squad.id == squad_id))
        squad = result.scalars().first()
        if squad:
            db.delete(squad)
            await db.commit()
        return True

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
