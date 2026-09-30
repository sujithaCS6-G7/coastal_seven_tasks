"""SQLAlchemy models for Day 9 PostgreSQL database (day9_db)."""

from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    """User account model for authentication in day9_db."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class UploadedFile(Base):
    """Stores metadata of uploaded files in day9_db (visible in pgAdmin)."""

    __tablename__ = "uploaded_files"

    id = Column(String(50), primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    format = Column(String(20), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    uploaded_at = Column(String(50), nullable=False)
    original_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=False)
    medium_url = Column(String(500), nullable=False)
    uploaded_by = Column(String(50), nullable=True, default="anonymous")

