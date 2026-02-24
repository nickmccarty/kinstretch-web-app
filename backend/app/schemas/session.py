import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionCreate(BaseModel):
    user_id: uuid.UUID
    title: str
    notes: str | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    notes: str | None = None


class SessionRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    video_count: int = 0

    model_config = {"from_attributes": True}
