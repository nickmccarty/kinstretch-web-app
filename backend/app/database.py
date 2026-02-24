from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# Async engine for FastAPI request handlers
async_engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(async_engine, expire_on_commit=False)

# Sync engine for background tasks (MediaPipe/OpenCV are blocking)
sync_engine = create_engine(settings.DATABASE_URL_SYNC, echo=False)
sync_session_factory = sessionmaker(sync_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


def get_sync_db() -> Session:
    return sync_session_factory()
