from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

DATABASE_URL = "postgresql+asyncpg://postgres:Suji%40123@localhost:5432/day5_db"

engine = create_async_engine(DATABASE_URL)

SessionLocal = async_sessionmaker(engine)