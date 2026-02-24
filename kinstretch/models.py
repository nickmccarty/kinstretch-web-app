from pydantic import BaseModel


class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseFrame(BaseModel):
    timestamp_ms: int
    landmarks: list[Landmark]


class VideoMetadata(BaseModel):
    url: str
    title: str | None = None
    creator: str | None = None
    transcript: str | None = None


class VideoAnalysis(BaseModel):
    metadata: VideoMetadata
    poses: list[PoseFrame] = []

    @property
    def n_frames(self) -> int:
        return len(self.poses)

    @property
    def duration_seconds(self) -> float:
        if not self.poses:
            return 0.0
        return self.poses[-1].timestamp_ms / 1000.0
