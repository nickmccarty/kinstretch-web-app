from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from app.config import settings


def save_upload(file_bytes: bytes, filename: str) -> Path:
    """Save an uploaded file to the uploads directory. Returns the file path."""
    ext = Path(filename).suffix or ".mp4"
    dest = settings.UPLOAD_DIR / f"{uuid.uuid4()}{ext}"
    dest.write_bytes(file_bytes)
    return dest


def download_youtube_video(url: str) -> tuple[Path, str | None, str | None]:
    """Download a YouTube video. Returns (file_path, video_title, channel_name)."""
    from kinstretch.youtube import download_video
    return download_video(url, out_dir=settings.UPLOAD_DIR)
