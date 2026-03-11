from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from app.models.social import Squad, SquadMember, Bond, Nudge, Report, Block
from app.models.user import Profile, User
from app.models.focus import FocusSession, Subject
from app.schemas.social import SquadCreate, ReportCreate, BlockCreate, HiveMatchTile, HiveMatchingResponse
from datetime import datetime, timedelta
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
        # 1. 检查是否被拉黑 (双向)
        block_check = await db.execute(
            select(Block).where(
                or_(
                    and_(Block.user_id == user_id_1, Block.blocked_id == user_id_2),
                    and_(Block.user_id == user_id_2, Block.blocked_id == user_id_1)
                )
            )
        )
        if block_check.scalars().first():
            raise ValueError("Cannot form bond due to privacy blocks.")

        # 2. 排序 ID 以确保唯一性
        u1, u2 = sorted([user_id_1, user_id_2])
        
        # 3. 检查是否已存在
        existing = await db.execute(select(Bond).where(Bond.user_id_1 == u1, Bond.user_id_2 == u2))
        if existing.scalars().first():
            return existing.scalars().first()

        db_bond = Bond(user_id_1=u1, user_id_2=u2, status="PENDING")
        db.add(db_bond)
        await db.commit()
        await db.refresh(db_bond)
        return db_bond

    @staticmethod
    async def remove_bond(db: AsyncSession, user_id_1: UUID, user_id_2: UUID):
        u1, u2 = sorted([user_id_1, user_id_2])
        result = await db.execute(select(Bond).where(Bond.user_id_1 == u1, Bond.user_id_2 == u2))
        db_bond = result.scalars().first()
        if db_bond:
            await db.delete(db_bond)
            await db.commit()
            return True
        return False

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
        # 查找与该用户相关的所有羁绊，并关联对方用户的 Profile
        # 我们需要分别处理 user_id 在 user_id_1 和 user_id_2 的情况
        
        from app.models.user import Profile

        # 1. 作为 user_id_1 时，关联 user_id_2 的 Profile
        stmt1 = (
            select(Bond, Profile)
            .join(Profile, Bond.user_id_2 == Profile.user_id)
            .where(Bond.user_id_1 == user_id)
        )
        result1 = await db.execute(stmt1)
        bonds1 = []
        for bond, profile in result1.all():
            bond_data = {
                "user_id_1": bond.user_id_1,
                "user_id_2": bond.user_id_2,
                "status": bond.status,
                "created_at": bond.created_at,
                "other_user": profile
            }
            bonds1.append(bond_data)

        # 2. 作为 user_id_2 时，关联 user_id_1 的 Profile
        stmt2 = (
            select(Bond, Profile)
            .join(Profile, Bond.user_id_1 == Profile.user_id)
            .where(Bond.user_id_2 == user_id)
        )
        result2 = await db.execute(stmt2)
        bonds2 = []
        for bond, profile in result2.all():
            bond_data = {
                "user_id_1": bond.user_id_1,
                "user_id_2": bond.user_id_2,
                "status": bond.status,
                "created_at": bond.created_at,
                "other_user": profile
            }
            bonds2.append(bond_data)

        return bonds1 + bonds2

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
        
        # 联动：拉黑时自动断开羁绊关系
        await SocialService.remove_bond(db, user_id, block_in.blocked_id)
        
        await db.commit()
        await db.refresh(db_block)
        return db_block

    @staticmethod
    async def get_hive_matching(db: AsyncSession, user_id: UUID) -> HiveMatchingResponse:
        # 1. 获取用户所在的小队 ID
        squad_result = await db.execute(
            select(SquadMember.squad_id).where(SquadMember.user_id == user_id, SquadMember.status == "ACTIVE")
        )
        squad_id = squad_result.scalars().first()

        # 2. 确定席位逻辑 (搭子 + 队友 + 同城/同路人)
        # 获取队友
        squad_members = []
        if squad_id:
            squad_stmt = (
                select(Profile, User.id)
                .join(User, Profile.user_id == User.id)
                .join(SquadMember, User.id == SquadMember.user_id)
                .where(SquadMember.squad_id == squad_id, User.id != user_id, SquadMember.status == "ACTIVE")
            )
            s_res = await db.execute(squad_stmt)
            squad_members = s_res.all()

        # 获取已接受的羁绊
        bonds_stmt = (
            select(Profile, User.id)
            .join(User, Profile.user_id == User.id)
            .join(Bond, or_(
                and_(Bond.user_id_1 == user_id, Bond.user_id_2 == User.id),
                and_(Bond.user_id_2 == user_id, Bond.user_id_1 == User.id)
            ))
            .where(Bond.status == "ACCEPTED")
        )
        b_res = await db.execute(bonds_stmt)
        bonds_members = b_res.all()

        # 排除已拉黑或被拉黑的用户
        block_query = await db.execute(select(Block.blocked_id).where(Block.user_id == user_id))
        blocked_by_me = [r[0] for r in block_query.all()]
        blocker_query = await db.execute(select(Block.user_id).where(Block.blocked_id == user_id))
        blocked_me = [r[0] for r in blocker_query.all()]
        exclude_ids = set(blocked_by_me + blocked_me + [user_id])

        # 获取活跃用户 (最近 30 分钟)
        active_cutoff = datetime.utcnow() - timedelta(minutes=30)
        
        # 结果集字典，用于去重
        tiles_dict = {}

        async def add_to_tiles(profiles_with_ids, is_squad=False, is_bond=False):
            for profile, uid in profiles_with_ids:
                if uid in exclude_ids or uid in tiles_dict:
                    continue
                
                # 获取该用户的最新专注状态
                session_stmt = (
                    select(FocusSession, Subject.name)
                    .join(Subject, FocusSession.subject_id == Subject.id)
                    .where(FocusSession.user_id == uid)
                    .order_by(FocusSession.start_time.desc())
                    .limit(1)
                )
                session_res = await db.execute(session_stmt)
                session_data = session_res.first()
                
                status = "offline"
                subject_name = None
                if session_data:
                    session, sub_name = session_data
                    if session.end_time is None:
                        status = "focus"
                        subject_name = sub_name
                    elif session.end_time > active_cutoff:
                        status = "break"
                
                tiles_dict[uid] = HiveMatchTile(
                    user_id=uid,
                    name=profile.name,
                    avatar_url=profile.avatar_url,
                    status=status,
                    subject=subject_name,
                    is_bond=is_bond,
                    is_squad=is_squad,
                    last_active=profile.updated_at or datetime.utcnow()
                )

        # 按优先级添加
        await add_to_tiles(squad_members, is_squad=True)
        await add_to_tiles(bonds_members, is_bond=True)

        # 补齐 ambient 用户 (模拟同数展示库，实际可以随机拉取一些最近活跃的其他用户)
        if len(tiles_dict) < 9:
            ambient_stmt = (
                select(Profile, User.id)
                .join(User, Profile.user_id == User.id)
                .where(User.id.not_in(exclude_ids | set(tiles_dict.keys())))
                .order_by(Profile.updated_at.desc())
                .limit(9 - len(tiles_dict))
            )
            a_res = await db.execute(ambient_stmt)
            await add_to_tiles(a_res.all())

        return HiveMatchingResponse(
            tiles=list(tiles_dict.values()),
            ambient_count=random.randint(50, 500) # Mock 附近总人数
        )
