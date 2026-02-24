from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TaskInfo:
    video_id: uuid.UUID
    status: TaskStatus = TaskStatus.PENDING
    progress_pct: float = 0.0
    error: str | None = None


# Module-level dict — fine for single-process prototype
_tasks: dict[uuid.UUID, TaskInfo] = {}


def create_task(video_id: uuid.UUID) -> TaskInfo:
    info = TaskInfo(video_id=video_id)
    _tasks[video_id] = info
    return info


def get_task(video_id: uuid.UUID) -> TaskInfo | None:
    return _tasks.get(video_id)


def update_task(video_id: uuid.UUID, status: TaskStatus, progress_pct: float = 0.0, error: str | None = None):
    info = _tasks.get(video_id)
    if info:
        info.status = status
        info.progress_pct = progress_pct
        info.error = error
