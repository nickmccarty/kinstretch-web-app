from __future__ import annotations

from pathlib import Path

from app.config import settings


def extract_poses_from_video(
    video_path: str | Path,
    start_s: float | None = None,
    stop_s: float | None = None,
    frame_stride: int = 5,
) -> list[dict]:
    """Extract poses and return them as a list of dicts ready for DB storage.

    Each dict has: frame_index, timestamp_ms, landmarks (list of 33 dicts).
    """
    from kinstretch.pose_extraction import extract_poses

    model_path = settings.MODEL_DIR / "pose_landmarker_heavy.task"
    pose_frames = extract_poses(
        video_path,
        model_path=model_path,
        start_s=start_s,
        stop_s=stop_s,
        frame_stride=frame_stride,
    )

    results = []
    for i, pf in enumerate(pose_frames):
        results.append({
            "frame_index": i,
            "timestamp_ms": pf.timestamp_ms,
            "landmarks": [lm.model_dump() for lm in pf.landmarks],
        })
    return results
