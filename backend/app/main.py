import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure the kinstretch package is importable from the project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import settings
from app.routers import measurements, poses, sessions, users, videos, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Download MediaPipe model on startup if not present
    from kinstretch.pose_extraction import download_model
    download_model(settings.MODEL_DIR)
    yield


app = FastAPI(
    title="Kinstretch Pose Analysis",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(poses.router, prefix="/api", tags=["poses"])
app.include_router(measurements.router, prefix="/api/measurements", tags=["measurements"])
app.include_router(ws.router, tags=["websocket"])

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
