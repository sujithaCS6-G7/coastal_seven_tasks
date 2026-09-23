from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)

from schemas import (
    RegisterRequest,
    RefreshRequest,
    ProductRequest
)


app = FastAPI()


# ---------- CORS ----------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ---------- SIMPLE DATA ----------

users = {}

products = {
    1: {
        "id": 1,
        "name": "Laptop",
        "price": 50000
    }
}


# ---------- OAUTH2 ----------

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="login"
)


# ---------- REGISTER ----------

@app.post("/register")
def register(data: RegisterRequest):

    if data.username in users:
        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )

    users[data.username] = {
        "username": data.username,
        "password": hash_password(data.password),
        "role": "user"
    }

    return {
        "message": "User registered successfully"
    }


# ---------- LOGIN ----------

@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends()
):

    user = users.get(form_data.username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        form_data.password,
        user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    access_token = create_access_token(
        user["username"]
    )

    refresh_token = create_refresh_token(
        user["username"]
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ---------- CURRENT USER ----------

def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Access token required"
        )

    username = payload.get("sub")

    user = users.get(username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# ---------- ADMIN CHECK ----------

def admin_only(
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# ---------- ME ----------

@app.get("/me")
def me(
    current_user: dict = Depends(get_current_user)
):

    return {
        "username": current_user["username"],
        "role": current_user["role"]
    }


# ---------- REFRESH ----------

@app.post("/refresh")
def refresh(data: RefreshRequest):

    payload = decode_token(data.refresh_token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Refresh token required"
        )

    new_access_token = create_access_token(
        payload["sub"]
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# ---------- PRODUCTS ----------

@app.get("/products")
def get_products(
    current_user: dict = Depends(get_current_user)
):

    return list(products.values())


@app.post("/products")
def create_product(
    data: ProductRequest,
    current_user: dict = Depends(admin_only)
):

    product_id = max(products.keys()) + 1

    products[product_id] = {
        "id": product_id,
        "name": data.name,
        "price": data.price
    }

    return products[product_id]