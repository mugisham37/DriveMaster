"""Database connection and session management."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,
    future=True
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


@asynccontextmanager
async def get_db_session():
    """Get database session context manager."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_database():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise


async def close_database():
    """Close database connections."""
    try:
        await engine.dispose()
        logger.info("Database connections closed")
        
    except Exception as e:
        logger.error("Failed to close database connections", error=str(e))