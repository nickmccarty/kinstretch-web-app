import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.video import SourceType, Video
from app.schemas.video import TaskStatusResponse, VideoRead, VideoUpdateRequest, WebcamCreateRequest, YouTubeImportRequest
from app.services import video_service
from app.services.task_manager import TaskStatus, create_task, get_task
from app.tasks.video_processing import process_video_task

router = APIRouter()


@router.post("/upload", response_model=VideoRead, status_code=201)
async def upload_video(
    background_tasks: BackgroundTasks,
    session_id: uuid.UUID = Form(...),
    title: str | None = Form(None),
    start_s: float | None = Form(None),
    stop_s: float | None = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()
    file_path = video_service.save_upload(file_bytes, file.filename or "video.mp4")

    raw_name = file.filename or "video.mp4"
    default_title = Path(raw_name).stem  # strip extension

    video = Video(
        session_id=session_id,
        source_type=SourceType.upload,
        file_path=str(file_path),
        title=title or default_title,
        status="pending",
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    create_task(video.id)
    background_tasks.add_task(process_video_task, video.id, "upload", None, str(file_path), start_s, stop_s)

    return video


@router.post("/youtube", response_model=VideoRead, status_code=201)
async def import_youtube(
    body: YouTubeImportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    video = Video(
        session_id=body.session_id,
        source_type=SourceType.youtube,
        url=body.url,
        title=body.title,
        status="pending",
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    create_task(video.id)
    background_tasks.add_task(process_video_task, video.id, "youtube", body.url, None, body.start_s, body.stop_s)

    return video


@router.post("/webcam", response_model=VideoRead, status_code=201)
async def create_webcam_video(body: WebcamCreateRequest, db: AsyncSession = Depends(get_db)):
    video = Video(
        session_id=body.session_id,
        source_type=SourceType.webcam,
        title=body.title or "Webcam Recording",
        status="pending",
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    return video


@router.get("", response_model=list[VideoRead])
async def list_videos(session_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Video).order_by(Video.created_at.desc())
    if session_id:
        stmt = stmt.where(Video.session_id == session_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video not found")
    return video


@router.get("/{video_id}/status", response_model=TaskStatusResponse)
async def get_video_status(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = get_task(video_id)
    if task:
        return TaskStatusResponse(
            video_id=video_id,
            status=task.status.value,
            progress_pct=task.progress_pct,
            error=task.error,
        )
    # Fallback to DB status
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video not found")
    return TaskStatusResponse(
        video_id=video_id,
        status=video.status,
        progress_pct=100.0 if video.status == "completed" else 0.0,
        error=video.error_message,
    )


@router.patch("/{video_id}", response_model=VideoRead)
async def update_video(video_id: uuid.UUID, body: VideoUpdateRequest, db: AsyncSession = Depends(get_db)):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video not found")
    if body.title is not None:
        video.title = body.title
    await db.commit()
    await db.refresh(video)
    return video


@router.delete("/{video_id}", status_code=204)
async def delete_video(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video not found")
    await db.delete(video)
    await db.commit()
