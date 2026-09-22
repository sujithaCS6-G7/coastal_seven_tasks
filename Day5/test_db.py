import asyncio
from sqlalchemy import text
from database import engine


async def test_connection():
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
        print("Database connected successfully")

    await engine.dispose()


asyncio.run(test_connection())