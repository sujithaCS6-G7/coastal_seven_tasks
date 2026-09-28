"""Database connection and session management for PostgreSQL day9_db."""

import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.models import Base

logger = logging.getLogger(__name__)

# Engine configuration for PostgreSQL
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Verify PostgreSQL server and day9_db availability."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning(f"PostgreSQL connection failed: {exc}")
        return False


def init_db():
    """Create tables in day9_db on startup and seed default admin user."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database 'day9_db' initialized successfully.")

        # Seed default admin user if not already present
        from app.database.models import User
        import bcrypt

        with SessionLocal() as db:
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw(b"password123", salt).decode("utf-8")
                default_admin = User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=hashed,
                    is_active=True,
                )
                db.add(default_admin)
                db.commit()
                logger.info("Default user 'admin' (password: password123) seeded into day9_db.")
    except Exception as exc:
        logger.warning(f"Database init warning: {exc}")


# Initialize tables upon load
init_db()

