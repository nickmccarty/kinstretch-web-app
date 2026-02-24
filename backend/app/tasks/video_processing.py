from __future__ import annotations

import uuid
import traceback

from app.database import get_sync_db
from app.models.pose_frame import PoseFrame as PoseFrameORM
from app.models.video import Video as VideoORM
from app.services import pose_service, video_service
from app.services.task_manager import TaskStatus, update_task


def process_video_task(
    video_id: uuid.UUID,
    source_type: str,
    url: str | None,
    file_path: str | None,
    start_s: float | None = None,
    stop_s: float | None = None,
):
    """Background task: download video (if YouTube), extract poses, store in DB.

    Called from FastAPI BackgroundTasks so runs in a thread.
    """
    db = get_sync_db()
    try:
        video = db.get(VideoORM, video_id)
        if not video:
            return

        video.status = "processing"
        db.commit()
        update_task(video_id, TaskStatus.PROCESSING, progress_pct=5.0)

        # Step 1: Get the video file
        if source_type == "youtube" and url:
            update_task(video_id, TaskStatus.PROCESSING, progress_pct=10.0)
            path, yt_title, yt_creator = video_service.download_youtube_video(url)
            video.file_path = str(path)
            if yt_title and not video.title:
                video.title = yt_title
            if yt_creator and not video.creator:
                video.creator = yt_creator
            db.commit()
            update_task(video_id, TaskStatus.PROCESSING, progress_pct=30.0)
        elif file_path:
            path = file_path
            update_task(video_id, TaskStatus.PROCESSING, progress_pct=30.0)
        else:
            raise ValueError("No video source available")

        # Step 2: Extract poses
        update_task(video_id, TaskStatus.PROCESSING, progress_pct=35.0)
        pose_data = pose_service.extract_poses_from_video(str(path), start_s=start_s, stop_s=stop_s, frame_stride=5)
        update_task(video_id, TaskStatus.PROCESSING, progress_pct=85.0)

        # Step 3: Store in DB
        for frame in pose_data:
            db.add(PoseFrameORM(
                video_id=video_id,
                frame_index=frame["frame_index"],
                timestamp_ms=frame["timestamp_ms"],
                landmarks=frame["landmarks"],
            ))

        video.frame_count = len(pose_data)
        if pose_data:
            video.duration_ms = pose_data[-1]["timestamp_ms"]
        video.status = "completed"
        db.commit()
        update_task(video_id, TaskStatus.COMPLETED, progress_pct=100.0)

    except Exception as e:
        db.rollback()
        video = db.get(VideoORM, video_id)
        if video:
            video.status = "failed"
            video.error_message = str(e)
            db.commit()
        update_task(video_id, TaskStatus.FAILED, error=str(e))
        traceback.print_exc()
    finally:
        db.close()
