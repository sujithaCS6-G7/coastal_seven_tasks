from fastapi import FastAPI
from schemas import User as UserSchema

from crud import (
    create_user,
    get_user,
    get_all_users,
    update_user,
    delete_user,
    create_product,
    get_product,
    get_all_products,
    update_product,
    delete_product
)


app = FastAPI()


@app.get("/")
def home():
    return {"message": "Day 5 - FastAPI + Pydantic + SQLAlchemy"}


# ---------- FASTAPI + PYDANTIC ----------

@app.get("/users/{user_id}")
def get_user_id(user_id: int):
    return {"user_id": user_id}


@app.get("/users/{user_id}/details", response_model=UserSchema)
def get_user_details(user_id: int):
    return {
        "id": user_id,
        "name": "Sujitha",
        "email": "suji@example.com",
        "age": 22,
        "address": {
            "city": "Hyderabad",
            "pincode": 500001
        }
    }


@app.get("/users")
def get_users(limit: int = 10, skip: int = 0):
    return {"limit": limit, "skip": skip}


@app.post("/users")
def create_user_test(user: UserSchema):
    return user


# ---------- USER DATABASE CRUD ----------

@app.post("/db/users")
async def create_db_user(name: str, email: str):
    return await create_user(name, email)


@app.get("/db/users/{user_id}")
async def read_db_user(user_id: int):
    return await get_user(user_id)


@app.get("/db/users")
async def read_all_db_users():
    return await get_all_users()


@app.put("/db/users/{user_id}")
async def update_db_user(user_id: int, name: str, email: str):
    return await update_user(user_id, name, email)


@app.delete("/db/users/{user_id}")
async def delete_db_user(user_id: int):
    return await delete_user(user_id)


# ---------- PRODUCT DATABASE CRUD ----------

@app.post("/db/products")
async def create_db_product(
    name: str,
    price: float,
    user_id: int
):
    return await create_product(name, price, user_id)


@app.get("/db/products/{product_id}")
async def read_db_product(product_id: int):
    return await get_product(product_id)


@app.get("/db/products")
async def read_all_db_products():
    return await get_all_products()


@app.put("/db/products/{product_id}")
async def update_db_product(
    product_id: int,
    name: str,
    price: float,
    user_id: int
):
    return await update_product(
        product_id,
        name,
        price,
        user_id
    )


@app.delete("/db/products/{product_id}")
async def delete_db_product(product_id: int):
    return await delete_product(product_id)