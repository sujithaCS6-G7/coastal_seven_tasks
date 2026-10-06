"""Database configuration and session management for PostgreSQL day10_db."""

import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models import Base, Product, User

logger = logging.getLogger(__name__)

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
    """Verify PostgreSQL server and day10_db availability."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning(f"PostgreSQL connection failed: {exc}")
        return False


def init_db():
    """Create tables in day10_db and seed default admin & sample catalog."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL database 'day10_db' initialized successfully.")

        # Seed admin and sample products
        from app.utils.security import hash_password

        with SessionLocal() as db:
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                default_admin = User(
                    username="admin",
                    email="admin@ecommerce.com",
                    hashed_password=hash_password("password123"),
                    role="admin",
                    is_active=True,
                )
                db.add(default_admin)
                db.commit()
                logger.info("Default admin user created (admin / password123)")

            # Seed sample products if catalog is empty
            product_count = db.query(Product).count()
            if product_count == 0:
                sample_products = [
                    Product(
                        name="Laptop Pro 15",
                        description="High-performance laptop with 16GB RAM and 512GB SSD.",
                        price=1299.99,
                        stock=25,
                        category="Electronics",
                        image_url="/uploads/products/laptop.jpg",
                    ),
                    Product(
                        name="Wireless Noise-Cancelling Headphones",
                        description="Premium over-ear headphones with 30-hour battery life.",
                        price=199.99,
                        stock=50,
                        category="Audio",
                        image_url="/uploads/products/headphones.jpg",
                    ),
                    Product(
                        name="Mechanical Gaming Keyboard",
                        description="RGB backlit mechanical keyboard with tactile blue switches.",
                        price=89.99,
                        stock=40,
                        category="Accessories",
                        image_url="/uploads/products/keyboard.jpg",
                    ),
                    Product(
                        name="4K Ultra HD Monitor 27 inch",
                        description="IPS panel 4K UHD monitor with HDR10 support.",
                        price=349.99,
                        stock=15,
                        category="Displays",
                        image_url="/uploads/products/monitor.jpg",
                    ),
                    Product(
                        name="Ergonomic Wireless Mouse",
                        description="Precision optical wireless mouse designed for ergonomics.",
                        price=49.99,
                        stock=80,
                        category="Accessories",
                        image_url="/uploads/products/mouse.jpg",
                    ),
                ]
                db.add_all(sample_products)
                db.commit()
                logger.info("Sample e-commerce catalog seeded successfully.")
    except Exception as exc:
        logger.warning(f"Database init warning: {exc}")
