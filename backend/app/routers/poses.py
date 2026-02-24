import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pose_frame import PoseFrame
from app.models.video import Video
from app.schemas.pose import PoseDataResponse, PoseFrameRead

router = APIRouter()


@router.get("/videos/{video_id}/poses", response_model=PoseDataResponse)
async def get_poses(
    video_id: uuid.UUID,
    start_ms: int | None = Query(None),
    stop_ms: int | None = Query(None),
    stride: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
):
    video = await db.get(Video, video_id)
    if not video:
        raise HTTPException(404, "Video not found")

    stmt = (
        select(PoseFrame)
        .where(PoseFrame.video_id == video_id)
        .order_by(PoseFrame.frame_index)
    )
    if start_ms is not None:
        stmt = stmt.where(PoseFrame.timestamp_ms >= start_ms)
    if stop_ms is not None:
        stmt = stmt.where(PoseFrame.timestamp_ms <= stop_ms)

    result = await db.execute(stmt)
    all_frames = result.scalars().all()

    # Apply stride
    frames = all_frames[::stride]

    return PoseDataResponse(
        video_id=video_id,
        frame_count=len(frames),
        frames=[
            PoseFrameRead(
                frame_index=f.frame_index,
                timestamp_ms=f.timestamp_ms,
                landmarks=f.landmarks,
            )
            for f in frames
        ],
    )


@router.get("/videos/{video_id}/poses/{frame_index}", response_model=PoseFrameRead)
async def get_single_frame(
    video_id: uuid.UUID,
    frame_index: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PoseFrame).where(
            PoseFrame.video_id == video_id,
            PoseFrame.frame_index == frame_index,
        )
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Frame not found")
    return PoseFrameRead(
        frame_index=frame.frame_index,
        timestamp_ms=frame.timestamp_ms,
        landmarks=frame.landmarks,
    )
