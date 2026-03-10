import asyncio
from uuid import UUID
from app.core.database import AsyncSessionLocal as SessionLocal
from app.services.social import SocialService

async def debug_bonds():
    user_id = UUID("8750b191-6d30-4c1c-a05d-1f97b86f38fd")
    async with SessionLocal() as db:
        bonds = await SocialService.get_user_bonds(db, user_id)
        print(f"Total bonds found in service: {len(bonds)}")
        for i, b in enumerate(bonds):
            print(f"Bond {i}: status={b['status']}, has_other_user={b.get('other_user') is not None}")
            if b.get('other_user'):
                ou = b['other_user']
                print(f"  Other User: id={ou.user_id}, name={ou.name}, city={ou.city}")

if __name__ == "__main__":
    asyncio.run(debug_bonds())
