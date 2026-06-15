from fastapi import Depends, HTTPException
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from app.core.security import decode_token

# strict auth
bearer_scheme = HTTPBearer()

# optional auth
optional_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    try:
        token = credentials.credentials
        return decode_token(token)

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        optional_bearer_scheme
    )
):
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        return decode_token(token)

    except Exception:
        return None