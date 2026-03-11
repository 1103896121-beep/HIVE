import asyncio
from app.models.user import Profile
from app.models.focus import FocusSession
from app.services.focus import FocusService
from app.core.database import AsyncSessionLocal
from sqlalchemy.future import select

async def verify_sparks():
    async with AsyncSessionLocal() as db:
        # 1. 找一个测试用户
        res = await db.execute(select(Profile))
        profile = res.scalars().first()
        if not profile:
            print("No profile found")
            return
        
        user_id = profile.user_id
        initial_sparks = profile.total_sparks
        initial_mins = profile.total_focus_mins
        print(f"User: {profile.name}, Initial Sparks: {initial_sparks}, Mins: {initial_mins}")

        # 2. 创建一个模拟的进场 Session
        session = FocusSession(
            user_id=user_id,
            subject_id=1,
            status="IN_PROGRESS"
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        print(f"Started Session: {session.id}")

        # 3. 结束 Session 并增加 25 分钟
        duration = 25
        # 注意：end_session 内部会 commit
        await FocusService.end_session(db, session.id, duration)
        
        # 4. 再次检查 Profile
        # 需要重新查询以获取最新数值
        res = await db.execute(select(Profile).where(Profile.user_id == user_id))
        updated_profile = res.scalars().first()
        print(f"Final Sparks: {updated_profile.total_sparks}, Mins: {updated_profile.total_focus_mins}")
        
        if updated_profile.total_sparks == initial_sparks + duration:
            print("SUCCESS: Sparks accumulated correctly!")
        else:
            print(f"FAILURE: Expected {initial_sparks + duration}, got {updated_profile.total_sparks}")

if __name__ == "__main__":
    asyncio.run(verify_sparks())
