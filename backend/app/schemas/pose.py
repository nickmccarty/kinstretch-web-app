import uuid

from pydantic import BaseModel


class PoseLandmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseFrameRead(BaseModel):
    frame_index: int
    timestamp_ms: int
    landmarks: list[PoseLandmark]

    model_config = {"from_attributes": True}


class PoseDataResponse(BaseModel):
    video_id: uuid.UUID
    frame_count: int
    frames: list[PoseFrameRead]
