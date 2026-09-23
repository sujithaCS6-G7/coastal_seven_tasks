import bcrypt
from datetime import datetime, timedelta
from jose import jwt, JWTError

from config import settings


def hash_password(password: str):
    return bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()


def verify_password(password: str, hashed_password: str):
    return bcrypt.checkpw(
        password.encode(),
        hashed_password.encode()
    )


def create_token(username: str, token_type: str, minutes: int):
    expire = datetime.utcnow() + timedelta(minutes=minutes)

    data = {
        "sub": username,
        "type": token_type,
        "exp": expire
    }

    return jwt.encode(
        data,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def create_access_token(username: str):
    return create_token(
        username,
        "access",
        settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


def create_refresh_token(username: str):
    return create_token(
        username,
        "refresh",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60
    )


def decode_token(token: str):
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        return None