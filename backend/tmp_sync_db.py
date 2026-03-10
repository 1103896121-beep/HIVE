import asyncio
from app.core.database import engine, Base
from app.models.user import User, Profile
from app.models.social import Squad, SquadMember, Bond, Nudge, Report, Block

async def sync():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database schema synced successfully.")

if __name__ == "__main__":
    asyncio.run(sync())
