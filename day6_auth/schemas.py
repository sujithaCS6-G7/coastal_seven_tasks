from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ProductRequest(BaseModel):
    name: str
    price: float