import uuid
from datetime import datetime

from pydantic import BaseModel


class YouTubeImportRequest(BaseModel):
    session_id: uuid.UUID
    url: str
    title: str | None = None
    start_s: float | None = None
    stop_s: float | None = None


class VideoUpdateRequest(BaseModel):
    title: str | None = None


class WebcamCreateRequest(BaseModel):
    session_id: uuid.UUID
    title: str | None = None


class VideoRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    source_type: str
    url: str | None
    file_path: str | None = None
    title: str | None
    creator: str | None
    duration_ms: int | None
    frame_count: int | None
    status: str
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskStatusResponse(BaseModel):
    video_id: uuid.UUID
    status: str
    progress_pct: float
    error: str | None = None
