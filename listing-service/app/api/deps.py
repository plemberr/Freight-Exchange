from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_token

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    try:
        token = credentials.credentials
        return decode_token(token)

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")