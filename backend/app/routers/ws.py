import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database import get_sync_db
from app.models.pose_frame import PoseFrame as PoseFrameORM
from app.models.video import Video as VideoORM

router = APIRouter()


@router.websocket("/ws/pose-stream/{video_id}")
async def pose_stream(websocket: WebSocket, video_id: uuid.UUID):
    await websocket.accept()

    frames_buffer: list[dict] = []
    recording = False
    frame_count = 0

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start_recording":
                recording = True
                frames_buffer = []
                await websocket.send_json({"type": "recording_started"})

            elif msg_type == "stop_recording":
                recording = False
                # Bulk insert buffered frames using sync session (runs in thread)
                db = get_sync_db()
                try:
                    for f in frames_buffer:
                        db.add(PoseFrameORM(
                            video_id=video_id,
                            frame_index=f["frame_index"],
                            timestamp_ms=f["timestamp_ms"],
                            landmarks=f["landmarks"],
                        ))
                    video = db.get(VideoORM, video_id)
                    if video:
                        video.frame_count = len(frames_buffer)
                        video.duration_ms = frames_buffer[-1]["timestamp_ms"] if frames_buffer else 0
                        video.status = "completed"
                    db.commit()
                finally:
                    db.close()

                await websocket.send_json({
                    "type": "recording_stopped",
                    "frame_count": len(frames_buffer),
                    "duration_ms": frames_buffer[-1]["timestamp_ms"] if frames_buffer else 0,
                })
                frames_buffer = []

            elif msg_type == "pose_frame":
                frame_count += 1
                if recording:
                    frames_buffer.append(data)
                    # Periodic flush for long sessions
                    if len(frames_buffer) >= 500:
                        db = get_sync_db()
                        try:
                            for f in frames_buffer:
                                db.add(PoseFrameORM(
                                    video_id=video_id,
                                    frame_index=f["frame_index"],
                                    timestamp_ms=f["timestamp_ms"],
                                    landmarks=f["landmarks"],
                                ))
                            db.commit()
                        finally:
                            db.close()
                        frames_buffer = []

                if frame_count % 30 == 0:
                    await websocket.send_json({"type": "ack", "frames_received": frame_count})

    except WebSocketDisconnect:
        # Save any remaining buffered frames
        if frames_buffer:
            db = get_sync_db()
            try:
                for f in frames_buffer:
                    db.add(PoseFrameORM(
                        video_id=video_id,
                        frame_index=f["frame_index"],
                        timestamp_ms=f["timestamp_ms"],
                        landmarks=f["landmarks"],
                    ))
                video = db.get(VideoORM, video_id)
                if video:
                    video.frame_count = (video.frame_count or 0) + len(frames_buffer)
                    video.status = "completed"
                db.commit()
            finally:
                db.close()
