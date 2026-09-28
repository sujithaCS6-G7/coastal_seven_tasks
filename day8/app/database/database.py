"""Database and caching connections with PostgreSQL (day8_db in pgAdmin) and Redis."""

import logging
from typing import Any, Generator
import redis
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.database.models import Base, Product, User

logger = logging.getLogger(__name__)

# Redis Client Instance
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True,
    socket_timeout=2.0,
)


def get_redis_client() -> redis.Redis:
    """Return active Redis client."""
    return redis_client


def check_redis_connection() -> bool:
    """Verify Redis server availability."""
    try:
        return bool(redis_client.ping())
    except Exception as exc:
        logger.warning(f"Redis ping failed: {exc}")
        return False


# PostgreSQL Engine & Session Configuration
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
    """Verify PostgreSQL server availability."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning(f"PostgreSQL ping failed: {exc}")
        return False


DEFAULT_ADMIN_HASH = "$2b$12$7/ZxhEIQ/GOZAFyaY/sX.uUJtikZY9KHsQ.1eX0AJwsob3XK8G/iG"


def init_db():
    """Initialize PostgreSQL tables and pre-seed initial data in day8_db."""
    try:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            # Seed default admin user if not present
            admin = db.query(User).filter(User.username == "admin").first()
            if not admin:
                default_user = User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=DEFAULT_ADMIN_HASH,
                )
                db.add(default_user)

            # Seed default products if table is empty
            if db.query(Product).count() == 0:
                initial_products = [
                    Product(name="Laptop", price=50000.0),
                    Product(name="Mouse", price=1000.0),
                    Product(name="Mechanical Keyboard", price=4500.0),
                    Product(name="4K Gaming Monitor", price=32000.0),
                ]
                db.add_all(initial_products)
            db.commit()
            logger.info("PostgreSQL database 'day8_db' initialized and seeded successfully.")
    except Exception as exc:
        logger.warning(f"Database initialization warning: {exc}")


# Initialize tables on application startup
init_db()


# Backwards-compatible proxy wrappers backed directly by PostgreSQL tables!
class ProductsDBProxy(list):
    """Proxy list backed directly by PostgreSQL 'products' table."""

    def __iter__(self):
        try:
            with SessionLocal() as db:
                products = db.query(Product).order_by(Product.id).all()
                return iter([{"id": p.id, "name": p.name, "price": p.price} for p in products])
        except Exception:
            return iter([])

    def __len__(self):
        try:
            with SessionLocal() as db:
                return db.query(Product).count()
        except Exception:
            return 0

    def append(self, item: dict[str, Any]):
        try:
            with SessionLocal() as db:
                product = Product(name=item["name"], price=item["price"])
                db.add(product)
                db.commit()
                db.refresh(product)
                item["id"] = product.id
        except Exception as e:
            logger.error(f"Error inserting product into PostgreSQL: {e}")


class UsersDBProxy(list):
    """Proxy list backed directly by PostgreSQL 'users' table."""

    def __iter__(self):
        try:
            with SessionLocal() as db:
                users = db.query(User).order_by(User.id).all()
                return iter([
                    {
                        "id": u.id,
                        "username": u.username,
                        "email": u.email,
                        "hashed_password": u.hashed_password,
                    }
                    for u in users
                ])
        except Exception:
            return iter([])

    def __len__(self):
        try:
            with SessionLocal() as db:
                return db.query(User).count()
        except Exception:
            return 0

    def append(self, item: dict[str, Any]):
        try:
            with SessionLocal() as db:
                user = User(
                    username=item["username"],
                    email=item["email"],
                    hashed_password=item["hashed_password"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                item["id"] = user.id
        except Exception as e:
            logger.error(f"Error inserting user into PostgreSQL: {e}")


products_db = ProductsDBProxy()
users_db = UsersDBProxy()
