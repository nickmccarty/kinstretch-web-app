import uuid
from datetime import datetime

from pydantic import BaseModel


class AngleCalcRequest(BaseModel):
    video_id: uuid.UUID
    frame_index: int
    edge_a: list[int]  # [landmark_a, landmark_b]
    edge_b: list[int]  # [landmark_c, landmark_d]


class AngleCalcResponse(BaseModel):
    joint_index: int
    angle_degrees: float
    joint_name: str
    edge_a_name: str
    edge_b_name: str


class MeasurementCreate(BaseModel):
    session_id: uuid.UUID
    video_id: uuid.UUID
    frame_index: int
    frame_timestamp_ms: int
    joint_index: int
    edge_a: list[int]
    edge_b: list[int]
    angle_degrees: float
    label: str | None = None


class MeasurementRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    video_id: uuid.UUID
    frame_index: int
    frame_timestamp_ms: int
    joint_index: int
    edge_a: list[int]
    edge_b: list[int]
    angle_degrees: float
    label: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
