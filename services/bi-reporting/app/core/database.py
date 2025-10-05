"""Database configuration and connection management."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Database engine
engine = None
async_session_maker = None

# Base class for ORM models
Base = declarative_base()

# Metadata for table creation
metadata = MetaData()


async def init_database():
    """Initialize database connection and create tables."""
    global engine, async_session_maker
    
    try:
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            echo=settings.DATABASE_ECHO,
            future=True
        )
        
        # Create session maker
        async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise


async def close_database():
    """Close database connections."""
    global engine
    
    if engine:
        await engine.dispose()
        logger.info("Database connections closed")


@asynccontextmanager
async def get_db_session():
    """Get database session context manager."""
    if not async_session_maker:
        raise RuntimeError("Database not initialized")
    
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Dependency for FastAPI
async def get_db():
    """Database dependency for FastAPI."""
    async with get_db_session() as session:
        yield session