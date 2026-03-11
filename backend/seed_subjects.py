import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.focus import Subject, Base
from app.core.database import DATABASE_URL

async def seed_subjects():
    engine = create_async_engine(DATABASE_URL.replace("sqlite+aiosqlite:///", "sqlite+aiosqlite:///e:/workrooten/Hive/backend/"))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check current subjects
        result = await session.execute(select(Subject))
        subjects = result.scalars().all()
        print(f"Current subjects: {[s.name for s in subjects]}")
        
        if not subjects:
            new_subjects = [
                Subject(name='Mathematics', icon='Calculator', color_hex='#FFD700'),
                Subject(name='Coding', icon='Code', color_hex='#FFD700'),
                Subject(name='Languages', icon='Languages', color_hex='#FFD700'),
                Subject(name='Art', icon='Palette', color_hex='#FFD700'),
                Subject(name='Science', icon='Microchip', color_hex='#FFD700'),
                Subject(name='Music', icon='Music', color_hex='#FFD700'),
                Subject(name='Literature', icon='Book', color_hex='#FFD700'),
                Subject(name='Others', icon='Hash', color_hex='#FFD700'),
            ]
            session.add_all(new_subjects)
            await session.commit()
            print("Added 8 subjects.")
        else:
            # If some exist, rename Social to Others if present
            for s in subjects:
                if s.name == 'Social':
                    s.name = 'Others'
                    s.icon = 'Hash'
            await session.commit()
            
            # Then add the missing ones
            existing_names = {s.name for s in subjects}
            extra_subjects = [
                Subject(name='Science', icon='Microchip', color_hex='#FFD700'),
                Subject(name='Music', icon='Music', color_hex='#FFD700'),
                Subject(name='Literature', icon='Book', color_hex='#FFD700'),
                Subject(name='Others', icon='Hash', color_hex='#FFD700'),
            ]
            to_add = [s for s in extra_subjects if s.name not in existing_names]
            if to_add:
                session.add_all(to_add)
                await session.commit()
                print(f"Added {len(to_add)} more subjects.")
            else:
                print("No new subjects to add.")

if __name__ == "__main__":
    asyncio.run(seed_subjects())
