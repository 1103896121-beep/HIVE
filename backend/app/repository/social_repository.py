from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from app.models.social import Squad, SquadMember, Bond, Report, Block
from app.models.user import Profile, User
from uuid import UUID
from typing import List, Optional, Tuple

class SocialRepository:
    @staticmethod
    async def get_user_active_squad_member(db: AsyncSession, user_id: UUID) -> Optional[SquadMember]:
        result = await db.execute(select(SquadMember).where(SquadMember.user_id == user_id, SquadMember.status == "ACTIVE"))
        return result.scalars().first()

    @staticmethod
    async def create_squad(db: AsyncSession, squad: Squad) -> Squad:
        db.add(squad)
        return squad

    @staticmethod
    async def create_squad_member(db: AsyncSession, member: SquadMember) -> SquadMember:
        db.add(member)
        return member

    @staticmethod
    async def get_squad_admin(db: AsyncSession, squad_id: UUID, admin_id: UUID) -> Optional[SquadMember]:
        result = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == admin_id, SquadMember.role == "ADMIN", SquadMember.status == "ACTIVE"))
        return result.scalars().first()

    @staticmethod
    async def get_squad_member(db: AsyncSession, squad_id: UUID, user_id: UUID) -> Optional[SquadMember]:
        result = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id))
        return result.scalars().first()

    @staticmethod
    async def get_pending_invitation(db: AsyncSession, user_id: UUID, squad_id: UUID) -> Optional[SquadMember]:
        result = await db.execute(select(SquadMember).where(SquadMember.squad_id == squad_id, SquadMember.user_id == user_id, SquadMember.status == "PENDING_INVITE"))
        return result.scalars().first()

    @staticmethod
    async def delete_item(db: AsyncSession, item) -> None:
        await db.delete(item)

    @staticmethod
    async def get_squad_by_id(db: AsyncSession, squad_id: UUID) -> Optional[Squad]:
        result = await db.execute(select(Squad).where(Squad.id == squad_id))
        return result.scalars().first()

    @staticmethod
    async def delete_squad_members(db: AsyncSession, squad_id: UUID) -> None:
        await db.execute(SquadMember.__table__.delete().where(SquadMember.squad_id == squad_id))

    @staticmethod
    async def get_block_bi_directional(db: AsyncSession, u1: UUID, u2: UUID) -> Optional[Block]:
        result = await db.execute(
            select(Block).where(
                or_(
                    and_(Block.user_id == u1, Block.blocked_id == u2),
                    and_(Block.user_id == u2, Block.blocked_id == u1)
                )
            )
        )
        return result.scalars().first()

    @staticmethod
    async def get_bond(db: AsyncSession, u1: UUID, u2: UUID) -> Optional[Bond]:
        result = await db.execute(select(Bond).where(Bond.user_id_1 == u1, Bond.user_id_2 == u2))
        return result.scalars().first()

    @staticmethod
    async def create_bond(db: AsyncSession, bond: Bond) -> Bond:
        db.add(bond)
        return bond

    @staticmethod
    async def get_user_squads(db: AsyncSession, user_id: UUID) -> List[Squad]:
        result = await db.execute(
            select(Squad)
            .join(SquadMember)
            .where(SquadMember.user_id == user_id)
        )
        return result.scalars().all()

    @staticmethod
    async def get_bonds_as_user1(db: AsyncSession, user_id: UUID) -> List[Tuple[Bond, Profile]]:
        stmt = (
            select(Bond, Profile)
            .join(Profile, Bond.user_id_2 == Profile.user_id)
            .where(Bond.user_id_1 == user_id)
        )
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def get_bonds_as_user2(db: AsyncSession, user_id: UUID) -> List[Tuple[Bond, Profile]]:
        stmt = (
            select(Bond, Profile)
            .join(Profile, Bond.user_id_1 == Profile.user_id)
            .where(Bond.user_id_2 == user_id)
        )
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def create_report(db: AsyncSession, report: Report) -> Report:
        db.add(report)
        return report

    @staticmethod
    async def create_block(db: AsyncSession, block: Block) -> Block:
        db.add(block)
        return block

    @staticmethod
    async def get_squad_id_for_user(db: AsyncSession, user_id: UUID) -> Optional[UUID]:
        result = await db.execute(
            select(SquadMember.squad_id).where(SquadMember.user_id == user_id, SquadMember.status == "ACTIVE")
        )
        return result.scalars().first()

    @staticmethod
    async def get_squad_members_profiles(db: AsyncSession, squad_id: UUID, exclude_user: UUID) -> List[Tuple[Profile, UUID]]:
        stmt = (
            select(Profile, User.id)
            .join(User, Profile.user_id == User.id)
            .join(SquadMember, User.id == SquadMember.user_id)
            .where(SquadMember.squad_id == squad_id, User.id != exclude_user, SquadMember.status == "ACTIVE")
        )
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def get_accepted_bonds_profiles(db: AsyncSession, user_id: UUID) -> List[Tuple[Profile, UUID]]:
        stmt = (
            select(Profile, User.id)
            .join(User, Profile.user_id == User.id)
            .join(Bond, or_(
                and_(Bond.user_id_1 == user_id, Bond.user_id_2 == User.id),
                and_(Bond.user_id_2 == user_id, Bond.user_id_1 == User.id)
            ))
            .where(Bond.status == "ACCEPTED")
        )
        result = await db.execute(stmt)
        return result.all()

    @staticmethod
    async def get_block_relations(db: AsyncSession, user_id: UUID) -> Tuple[List[UUID], List[UUID]]:
        block_query = await db.execute(select(Block.blocked_id).where(Block.user_id == user_id))
        blocked_by_me = [r[0] for r in block_query.all()]
        blocker_query = await db.execute(select(Block.user_id).where(Block.blocked_id == user_id))
        blocked_me = [r[0] for r in blocker_query.all()]
        return blocked_by_me, blocked_me
    @staticmethod
    async def commit(db: AsyncSession) -> None:
        await db.commit()

    @staticmethod
    async def get_nearby_profiles(db: AsyncSession, exclude_ids: set, limit: int) -> List[Tuple[Profile, UUID]]:
        stmt = (
            select(Profile, User.id)
            .join(User, Profile.user_id == User.id)
            .where(
                and_(
                    User.id.not_in(exclude_ids),
                    Profile.show_location == True
                )
            )
            .order_by(Profile.updated_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.all()
    @staticmethod
    async def refresh(db: AsyncSession, item) -> None:
        await db.refresh(item)
