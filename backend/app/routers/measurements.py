import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.measurement import Measurement
from app.models.pose_frame import PoseFrame
from app.schemas.measurement import AngleCalcRequest, AngleCalcResponse, MeasurementCreate, MeasurementRead
from app.services.angle_service import JOINT_NAMES, calculate_angle, get_edge_name

router = APIRouter()


@router.post("/calculate", response_model=AngleCalcResponse)
async def calculate_angle_endpoint(body: AngleCalcRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PoseFrame).where(
            PoseFrame.video_id == body.video_id,
            PoseFrame.frame_index == body.frame_index,
        )
    )
    frame = result.scalar_one_or_none()
    if not frame:
        raise HTTPException(404, "Pose frame not found")

    try:
        joint_idx, angle_deg = calculate_angle(frame.landmarks, body.edge_a, body.edge_b)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return AngleCalcResponse(
        joint_index=joint_idx,
        angle_degrees=round(angle_deg, 1),
        joint_name=JOINT_NAMES.get(joint_idx, f"Joint {joint_idx}"),
        edge_a_name=get_edge_name(body.edge_a),
        edge_b_name=get_edge_name(body.edge_b),
    )


@router.post("", response_model=MeasurementRead, status_code=201)
async def create_measurement(body: MeasurementCreate, db: AsyncSession = Depends(get_db)):
    measurement = Measurement(
        session_id=body.session_id,
        video_id=body.video_id,
        frame_index=body.frame_index,
        frame_timestamp_ms=body.frame_timestamp_ms,
        joint_index=body.joint_index,
        edge_a=body.edge_a,
        edge_b=body.edge_b,
        angle_degrees=body.angle_degrees,
        label=body.label,
    )
    db.add(measurement)
    await db.commit()
    await db.refresh(measurement)
    return measurement


@router.get("", response_model=list[MeasurementRead])
async def list_measurements(
    session_id: uuid.UUID | None = Query(None),
    video_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Measurement).order_by(Measurement.created_at.desc())
    if session_id:
        stmt = stmt.where(Measurement.session_id == session_id)
    if video_id:
        stmt = stmt.where(Measurement.video_id == video_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{measurement_id}", status_code=204)
async def delete_measurement(measurement_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    measurement = await db.get(Measurement, measurement_id)
    if not measurement:
        raise HTTPException(404, "Measurement not found")
    await db.delete(measurement)
    await db.commit()
