from jose import JWTError, jwt

from app.core.config import settings


with open(settings.jwt_public_key_path) as f:
    PUBLIC_KEY = f.read()


def decode_jwt(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=[settings.jwt_algorithm],
        )

        return payload

    except JWTError:
        raise ValueError("Invalid token")