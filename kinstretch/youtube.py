from __future__ import annotations

import os
from pathlib import Path

from yt_dlp import YoutubeDL
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)

from kinstretch.models import VideoMetadata


def _fetch_transcript(video_id: str) -> str | None:
    """Fetch the transcript for a single YouTube video, returning None on failure."""
    try:
        transcript_data = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join(segment["text"] for segment in transcript_data)
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception:
        return None


def search_videos(query: str, max_results: int = 100) -> list[VideoMetadata]:
    """Search YouTube and return metadata (including transcripts) for each result."""
    ydl_opts = {
        "quiet": True,
        "extract_flat": True,
        "skip_download": True,
    }

    results: list[VideoMetadata] = []

    with YoutubeDL(ydl_opts) as ydl:
        search_results = ydl.extract_info(
            f"ytsearch{max_results}:{query}",
            download=False,
        )

        for entry in search_results["entries"]:
            video_id = entry["id"]
            results.append(
                VideoMetadata(
                    url=f"https://www.youtube.com/watch?v={video_id}",
                    title=entry.get("title"),
                    creator=entry.get("channel"),
                    transcript=_fetch_transcript(video_id),
                )
            )

    return results


def download_video(url: str, out_dir: str | Path = "videos") -> tuple[Path, str | None, str | None]:
    """Download a YouTube video. Returns (file_path, video_title, channel_name)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
        "format": "mp4/bestvideo[ext=mp4]+bestaudio/best[ext=m4a]/best",
        "quiet": True,
    }

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = Path(ydl.prepare_filename(info))

        # Normalize extension to .mp4 if needed
        if filename.suffix != ".mp4" and filename.exists():
            new_name = filename.with_suffix(".mp4")
            os.rename(filename, new_name)
            filename = new_name

    creator = info.get("channel") or info.get("uploader") or None
    return filename, info.get("title"), creator
