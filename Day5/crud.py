from sqlalchemy import select
from models import User, Product
from database import SessionLocal


# ---------- USER CRUD ----------

async def create_user(name: str, email: str):
    async with SessionLocal() as session:
        user = User(name=name, email=email)

        session.add(user)
        await session.commit()
        await session.refresh(user)

        return user


async def get_user(user_id: int):
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )

        return result.scalar_one_or_none()


async def get_all_users():
    async with SessionLocal() as session:
        result = await session.execute(select(User))

        return result.scalars().all()


async def update_user(user_id: int, name: str, email: str):
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )

        user = result.scalar_one_or_none()

        if user is None:
            return None

        user.name = name
        user.email = email

        await session.commit()
        await session.refresh(user)

        return user


async def delete_user(user_id: int):
    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )

        user = result.scalar_one_or_none()

        if user is None:
            return None

        await session.delete(user)
        await session.commit()

        return user


# ---------- PRODUCT CRUD ----------

async def create_product(name: str, price: float, user_id: int):
    async with SessionLocal() as session:
        product = Product(
            name=name,
            price=price,
            user_id=user_id
        )

        session.add(product)
        await session.commit()
        await session.refresh(product)

        return product


async def get_product(product_id: int):
    async with SessionLocal() as session:
        result = await session.execute(
            select(Product).where(Product.id == product_id)
        )

        return result.scalar_one_or_none()


async def get_all_products():
    async with SessionLocal() as session:
        result = await session.execute(select(Product))

        return result.scalars().all()


async def update_product(
    product_id: int,
    name: str,
    price: float,
    user_id: int
):
    async with SessionLocal() as session:
        result = await session.execute(
            select(Product).where(Product.id == product_id)
        )

        product = result.scalar_one_or_none()

        if product is None:
            return None

        product.name = name
        product.price = price
        product.user_id = user_id

        await session.commit()
        await session.refresh(product)

        return product


async def delete_product(product_id: int):
    async with SessionLocal() as session:
        result = await session.execute(
            select(Product).where(Product.id == product_id)
        )

        product = result.scalar_one_or_none()

        if product is None:
            return None

        await session.delete(product)
        await session.commit()

        return product