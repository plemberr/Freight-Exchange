import uuid
from datetime import datetime

from pydantic import BaseModel

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    phone: str | None
    role: str
    is_blocked: bool
    created_at: datetime


    model_config = {
        "from_attributes": True
    }
class UpdateUserRequest(BaseModel):
    name: str | None = None
    phone: str | None = None