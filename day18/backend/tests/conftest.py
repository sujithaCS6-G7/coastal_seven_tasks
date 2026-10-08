"""Pytest fixtures for database, client, and authentication tokens."""

import io
import uuid
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.product import Product
from app.models.user import User
from app.utils.redis_client import redis_manager
from app.utils.security import create_access_token, hash_password

# Test SQLite in-memory engine with StaticPool for thread-safe test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db(request):
    """Create all tables before each SQLite unit test and drop after (skipped for live PostgreSQL Day 18 tests)."""
    if "test_day18" in request.node.nodeid:
        yield
        return

    Base.metadata.create_all(bind=test_engine)
    # Clear in-memory cart and cache fallbacks
    redis_manager._fallback_cart.clear()
    redis_manager._fallback_cache.clear()
    if redis_manager._client:
        try:
            redis_manager._client.flushdb()
        except Exception:
            pass
    yield
    Base.metadata.drop_all(bind=test_engine)
    if redis_manager._client:
        try:
            redis_manager._client.flushdb()
        except Exception:
            pass



@pytest.fixture
def db_session():
    """Yield an isolated test session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """FastAPI TestClient with overridden database dependency."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session):
    """Create and return an admin user."""
    admin = User(
        username=f"admin_{uuid.uuid4().hex[:6]}",
        email=f"admin_{uuid.uuid4().hex[:6]}@ecommerce.com",
        hashed_password=hash_password("adminpass123"),
        role="admin",
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def admin_headers(admin_user):
    """Return Authorization header with Bearer token for admin."""
    token = create_access_token(
        {"sub": admin_user.username, "user_id": admin_user.id, "role": "admin"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_user(db_session):
    """Create and return a regular customer user."""
    customer = User(
        username=f"customer_{uuid.uuid4().hex[:6]}",
        email=f"customer_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password=hash_password("custpass123"),
        role="customer",
        is_active=True,
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def customer_headers(customer_user):
    """Return Authorization header with Bearer token for customer."""
    token = create_access_token(
        {"sub": customer_user.username, "user_id": customer_user.id, "role": "customer"}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_product(db_session):
    """Create a sample product with available inventory."""
    product = Product(
        name="Ultra Gaming Mouse",
        description="High precision wireless mouse.",
        price=59.99,
        stock=20,
        category="Accessories",
        image_url="/uploads/products/mouse.jpg",
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


@pytest.fixture
def sample_image_bytes():
    """Create small valid in-memory PNG image bytes."""
    img = Image.new("RGB", (200, 200), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
