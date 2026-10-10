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
    """Create tables in day10_db, configure PostgreSQL FTS + pg_trgm GIN indexes, and seed catalog."""
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
            conn.execute(
                text(
                    "ALTER TABLE IF EXISTS products ADD COLUMN IF NOT EXISTS search_vector tsvector;"
                )
            )

        Base.metadata.create_all(bind=engine)

        # Configure PostgreSQL Full-Text Search trigger and GIN / Trigram indexes
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
                    BEGIN
                      NEW.search_vector :=
                        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
                        setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
                        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
                      RETURN NEW;
                    END
                    $$ LANGUAGE plpgsql;
                    """
                )
            )
            conn.execute(
                text("DROP TRIGGER IF EXISTS trg_products_search_vector ON products;")
            )
            conn.execute(
                text(
                    """
                    CREATE TRIGGER trg_products_search_vector
                    BEFORE INSERT OR UPDATE OF name, category, description
                    ON products
                    FOR EACH ROW
                    EXECUTE FUNCTION products_search_vector_trigger();
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE products SET search_vector =
                      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(description, '')), 'C')
                    WHERE search_vector IS NULL;
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_products_search_vector_gin ON products USING GIN (search_vector);"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_products_name_trgm_gin ON products USING GIN (name gin_trgm_ops);"
                )
            )
            conn.execute(
                text(
                    """
                    CREATE INDEX IF NOT EXISTS idx_products_trgm_gin
                    ON products USING GIN ((coalesce(name, '') || ' ' || coalesce(category, '') || ' ' || coalesce(description, '')) gin_trgm_ops);
                    """
                )
            )

        logger.info("PostgreSQL database 'day10_db' and FTS/pg_trgm GIN indexes initialized.")

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

            # Seed 3 default demo customer accounts (customer1, customer2, customer3)
            demo_customers = [
                ("customer1", "customer1@nexora.com"),
                ("customer2", "customer2@nexora.com"),
                ("customer3", "customer3@nexora.com"),
            ]
            for cust_username, cust_email in demo_customers:
                existing_cust = db.query(User).filter(User.username == cust_username).first()
                if not existing_cust:
                    db.add(
                        User(
                            username=cust_username,
                            email=cust_email,
                            hashed_password=hash_password("Password123!"),
                            role="customer",
                            is_active=True,
                        )
                    )
            db.commit()

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

            # Ensure iPhone 16 Pro Max exists for fuzzy/full-text search demos (e.g. 'iphon' -> 'iPhone 16 Pro Max')
            iphone_exists = (
                db.query(Product).filter(Product.name.ilike("%iPhone%")).first()
            )
            if not iphone_exists:
                db.add(
                    Product(
                        name="iPhone 16 Pro Max",
                        description="Flagship smartphone with A18 Pro chip, 5x Telephoto camera, and Titanium design.",
                        price=1199.99,
                        stock=30,
                        category="Electronics",
                        image_url="/uploads/products/laptop.jpg",
                    )
                )
                db.commit()
    except Exception as exc:
        logger.warning(f"Database init warning: {exc}")

