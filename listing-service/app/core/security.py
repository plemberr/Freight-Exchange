from jose import jwt, JWTError
from app.core.config import settings


def decode_token(token: str):
    try:
        return jwt.decode(
            token,
            settings.jwt_public_key,
            algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise ValueError("Invalid token")