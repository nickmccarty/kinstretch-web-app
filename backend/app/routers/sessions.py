import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import AnalysisSession
from app.models.video import Video
from app.schemas.session import SessionCreate, SessionRead, SessionUpdate

router = APIRouter()


@router.post("", response_model=SessionRead, status_code=201)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = AnalysisSession(user_id=body.user_id, title=body.title, notes=body.notes)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionRead(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
        video_count=0,
    )


@router.get("", response_model=list[SessionRead])
async def list_sessions(user_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            AnalysisSession,
            func.count(Video.id).label("video_count"),
        )
        .outerjoin(Video, Video.session_id == AnalysisSession.id)
        .group_by(AnalysisSession.id)
        .order_by(AnalysisSession.created_at.desc())
    )
    if user_id:
        stmt = stmt.where(AnalysisSession.user_id == user_id)

    result = await db.execute(stmt)
    rows = result.all()
    return [
        SessionRead(
            id=s.id,
            user_id=s.user_id,
            title=s.title,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at,
            video_count=count,
        )
        for s, count in rows
    ]


@router.get("/{session_id}", response_model=SessionRead)
async def get_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(AnalysisSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    count_result = await db.execute(
        select(func.count(Video.id)).where(Video.session_id == session_id)
    )
    video_count = count_result.scalar() or 0
    return SessionRead(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
        video_count=video_count,
    )


@router.patch("/{session_id}", response_model=SessionRead)
async def update_session(session_id: uuid.UUID, body: SessionUpdate, db: AsyncSession = Depends(get_db)):
    session = await db.get(AnalysisSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if body.title is not None:
        session.title = body.title
    if body.notes is not None:
        session.notes = body.notes
    await db.commit()
    await db.refresh(session)
    return SessionRead(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        notes=session.notes,
        created_at=session.created_at,
        updated_at=session.updated_at,
        video_count=0,
    )


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    session = await db.get(AnalysisSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()
