from sqlalchemy.ext.asyncio import AsyncSession
from app.models.social import Squad, SquadMember, Bond, Report, Block
from app.schemas.social import SquadCreate, ReportCreate, BlockCreate, HiveMatchTile, HiveMatchingResponse
from datetime import datetime, timedelta
from app.core.exceptions import LogicConflictException, PermissionDeniedException, ResourceNotFoundException
from app.repository.social_repository import SocialRepository
from app.repository.focus_repository import FocusRepository
from uuid import UUID
import random
from typing import Optional, List

class SocialService:
    @staticmethod
    async def _check_user_in_squad(db: AsyncSession, user_id: UUID) -> bool:
        return await SocialRepository.get_user_active_squad_member(db, user_id) is not None

    @staticmethod
    async def create_squad(db: AsyncSession, user_id: UUID, squad_in: SquadCreate) -> Squad:
        """
        创建战队并自动将创建者设为管理员。
        """
        if await SocialService._check_user_in_squad(db, user_id):
            raise LogicConflictException("User is already in an active squad.")

        db_squad = Squad(
            name=squad_in.name,
            is_private=squad_in.is_private,
            created_by=user_id
        )
        await SocialRepository.create_squad(db, db_squad)
        await db.flush()
        
        member = SquadMember(squad_id=db_squad.id, user_id=user_id, role="ADMIN", status="ACTIVE")
        await SocialRepository.create_squad_member(db, member)
        
        await SocialRepository.commit(db)
        await SocialRepository.refresh(db, db_squad)
        return db_squad

    @staticmethod
    async def invite_to_squad(db: AsyncSession, admin_id: UUID, user_id: UUID, squad_id: UUID) -> SquadMember:
        """
        由战队管理员发起用户邀请。为精简交互，已同意互信的好友将被直接免审核拉入。
        """
        admin_check = await SocialRepository.get_squad_admin(db, squad_id, admin_id)
        if not admin_check:
            raise PermissionDeniedException("Only an active admin can invite.")

        existing = await SocialRepository.get_squad_member(db, squad_id, user_id)
        if existing and existing.status == "ACTIVE":
            return existing

        if await SocialService._check_user_in_squad(db, user_id):
            raise ValueError("Player is already active in another hive.")

        member = SquadMember(squad_id=squad_id, user_id=user_id, status="ACTIVE")
        await SocialRepository.create_squad_member(db, member)
        await SocialRepository.commit(db)
        return member

    @staticmethod
    async def review_invitation(db: AsyncSession, user_id: UUID, squad_id: UUID, accept: bool) -> Optional[SquadMember]:
        """
        用户处理战队邀请（接受/拒绝）。
        """
        member = await SocialRepository.get_pending_invitation(db, user_id, squad_id)
        if not member:
            raise ResourceNotFoundException("Invitation not found.")

        if accept:
            if await SocialService._check_user_in_squad(db, user_id):
                raise LogicConflictException("You are already in an active squad.")
            member.status = "ACTIVE"
        else:
            await SocialRepository.delete_item(db, member)
        
        await SocialRepository.commit(db)
        return member if accept else None

    @staticmethod
    async def leave_squad(db: AsyncSession, user_id: UUID, squad_id: UUID) -> bool:
        """
        成员退出战队。管理员需先解散战队或移交权限。
        """
        member = await SocialRepository.get_squad_member(db, squad_id, user_id)
        if not member:
            raise ResourceNotFoundException("Member not found in squad.")
        
        if member.role == "ADMIN":
            raise LogicConflictException("Creator cannot leave the squad. Disband it instead.")

        await SocialRepository.delete_item(db, member)
        await SocialRepository.commit(db)
        return True

    @staticmethod
    async def disband_squad(db: AsyncSession, admin_id: UUID, squad_id: UUID) -> bool:
        """
        解散战队，所有成员将自动移除。
        """
        admin_check = await SocialRepository.get_squad_admin(db, squad_id, admin_id)
        if not admin_check:
            raise PermissionDeniedException("Only an active admin can disband the squad.")

        await SocialRepository.delete_squad_members(db, squad_id)
        squad = await SocialRepository.get_squad_by_id(db, squad_id)
        if squad:
            await SocialRepository.delete_item(db, squad)
            await SocialRepository.commit(db)
        return True

    @staticmethod
    async def create_bond(db: AsyncSession, user_id_1: UUID, user_id_2: UUID) -> Bond:
        """
        在两名用户之间建立社交联结 (Bond)。屏蔽名单中的用户无法建立联结。
        """
        if await SocialRepository.get_block_bi_directional(db, user_id_1, user_id_2):
            raise ValueError("Cannot form bond due to privacy blocks.")

        u1, u2 = sorted([user_id_1, user_id_2])
        existing = await SocialRepository.get_bond(db, u1, u2)
        if existing:
            return existing

        # user_id_1 视为发起者
        db_bond = Bond(user_id_1=u1, user_id_2=u2, status="PENDING", requester_id=user_id_1)
        await SocialRepository.create_bond(db, db_bond)
        await SocialRepository.commit(db)
        await SocialRepository.refresh(db, db_bond)
        return db_bond

    @staticmethod
    async def remove_bond(db: AsyncSession, user_id_1: UUID, user_id_2: UUID) -> bool:
        """
        解除现有的社交联结。
        """
        u1, u2 = sorted([user_id_1, user_id_2])
        db_bond = await SocialRepository.get_bond(db, u1, u2)
        if db_bond:
            await SocialRepository.delete_item(db, db_bond)
            await SocialRepository.commit(db)
            return True
        return False

    @staticmethod
    async def update_bond_status(db: AsyncSession, user_id_1: UUID, user_id_2: UUID, status: str) -> Optional[Bond]:
        """
        更新联结状态（如接受/拒绝）。
        """
        u1, u2 = sorted([user_id_1, user_id_2])
        db_bond = await SocialRepository.get_bond(db, u1, u2)
        if db_bond:
            db_bond.status = status
            await SocialRepository.commit(db)
            await SocialRepository.refresh(db, db_bond)
        return db_bond

    @staticmethod
    async def get_user_squads(db: AsyncSession, user_id: UUID) -> List[Squad]:
        return await SocialRepository.get_user_squads(db, user_id)

    @staticmethod
    async def get_user_bonds(db: AsyncSession, user_id: UUID) -> List[dict]:
        res1 = await SocialRepository.get_bonds_as_user1(db, user_id)
        bonds1 = [{
            "user_id_1": b.user_id_1, "user_id_2": b.user_id_2,
            "status": b.status, "requester_id": b.requester_id,
            "created_at": b.created_at, "other_user": p
        } for b, p in res1]

        res2 = await SocialRepository.get_bonds_as_user2(db, user_id)
        bonds2 = [{
            "user_id_1": b.user_id_1, "user_id_2": b.user_id_2,
            "status": b.status, "requester_id": b.requester_id,
            "created_at": b.created_at, "other_user": p
        } for b, p in res2]

        return bonds1 + bonds2

    @staticmethod
    async def create_report(db: AsyncSession, user_id: UUID, report_in: ReportCreate) -> Report:
        """
        创建用户举报。
        """
        db_report = Report(reporter_id=user_id, target_id=report_in.target_id, target_type=report_in.target_type, reason=report_in.reason)
        await SocialRepository.create_report(db, db_report)
        await SocialRepository.commit(db)
        await SocialRepository.refresh(db, db_report)
        return db_report

    @staticmethod
    async def block_user(db: AsyncSession, user_id: UUID, block_in: BlockCreate) -> Block:
        """
        拉黑用户并自动接触已存在的 Bond。
        """
        db_block = Block(user_id=user_id, blocked_id=block_in.blocked_id)
        await SocialRepository.create_block(db, db_block)
        await SocialService.remove_bond(db, user_id, block_in.blocked_id)
        await SocialRepository.commit(db)
        await SocialRepository.refresh(db, db_block)
        return db_block

    @staticmethod
    async def get_hive_matching(db: AsyncSession, user_id: UUID, lat: Optional[float] = None, lon: Optional[float] = None, radius_km: Optional[int] = None) -> HiveMatchingResponse:
        """
        核心 Hive 匹配算法。优先级：战队 -> 好友 -> 活跃用户。
        """
        squad_id = await SocialRepository.get_squad_id_for_user(db, user_id)
        squad_members = await SocialRepository.get_squad_members_profiles(db, squad_id, user_id) if squad_id else []
        bonds_members = await SocialRepository.get_accepted_bonds_profiles(db, user_id)
        blocked_by_me, blocked_me = await SocialRepository.get_block_relations(db, user_id)
        exclude_ids = set(list(blocked_by_me) + list(blocked_me) + [user_id])
        active_cutoff = datetime.utcnow() - timedelta(minutes=30)
        tiles_dict = {}

        from app.core.redis_client import redis_client
        online_users_set = await redis_client.get_global_presence(timeout_sec=15)

        async def add_to_tiles(profiles_with_ids, is_squad=False, is_bond=False):
            for profile, uid in profiles_with_ids:
                if uid in exclude_ids or uid in tiles_dict:
                    continue
                
                sessions = await FocusRepository.get_user_sessions(db, uid, limit=1)
                uid_str = str(uid)
                status = "online" if uid_str in online_users_set else "offline"
                subject_name = None

                if sessions:
                    session = sessions[0]
                    if session.end_time is None:
                        status = "focus"
                        subjects = await FocusRepository.get_all_subjects(db)
                        subject = next((s for s in subjects if s.id == session.subject_id), None)
                        subject_name = subject.name if subject else None
                    elif session.end_time > active_cutoff and status == "offline":
                        status = "break"
                
                tiles_dict[uid] = HiveMatchTile(
                    user_id=uid, name=profile.name, avatar_url=profile.avatar_url,
                    status=status, subject=subject_name, is_bond=is_bond, is_squad=is_squad,
                    last_active=profile.updated_at or datetime.utcnow()
                )

        await add_to_tiles(squad_members, is_squad=True)
        await add_to_tiles(bonds_members, is_bond=True)

        ambient_count = 0
        if lat is not None and lon is not None and radius_km is not None:
            profiles, ambient_count = await SocialRepository.get_nearby_profiles_by_distance(
                db, exclude_ids | set(tiles_dict.keys()), 9 - len(tiles_dict), lat, lon, radius_km
            )
            await add_to_tiles(profiles)
            if len(tiles_dict) < 9:
                a_res_all = await SocialRepository.get_nearby_profiles(db, exclude_ids | set(tiles_dict.keys()), 9 - len(tiles_dict))
                await add_to_tiles(a_res_all)

        return HiveMatchingResponse(tiles=list(tiles_dict.values()), ambient_count=ambient_count)


    @staticmethod
    async def get_global_stats(db: AsyncSession) -> dict:
        """
        获取全球 Hive 实时统计数据。
        1. total_online: 当前心跳活跃用户总数
        2. active_hives: 实际正在进行专注的用户终端总数
        3. total_sparks_today: 今日(UTC)已完成专注产生的累计星火 (通过 duration_mins 汇总)
        """
        from sqlalchemy import func, select
        from app.models.focus import FocusSession
        from app.core.redis_client import redis_client
        from datetime import datetime
        
        # 1. 在线人数 (Redis 实时心跳)
        total_online = await redis_client.get_global_presence_count()
        
        # 2. 活跃 Hive (实际正在进行专注的用户终端总数)
        # 统计所有 status='IN_PROGRESS' 的唯一用户数量
        active_sessions_res = await db.execute(
            select(func.count(FocusSession.user_id.distinct()))
            .where(FocusSession.status == "IN_PROGRESS")
        )
        hives_count = active_sessions_res.scalar() or 0
            
        # 3. 每日累计星火 (今天已完成的所有会话时长总和)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        spark_sum_res = await db.execute(
            select(func.sum(FocusSession.duration_mins))
            .where(FocusSession.status == "COMPLETED")
            .where(FocusSession.end_time >= today_start)
        )
        total_sparks_today = spark_sum_res.scalar() or 0
        
        return {
            "total_online": total_online,
            "active_hives": hives_count,
            "total_sparks_today": total_sparks_today
        }
