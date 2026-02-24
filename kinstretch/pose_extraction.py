from __future__ import annotations

import urllib.request
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np

from kinstretch.models import Landmark, PoseFrame

POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
)
DEFAULT_MODEL_DIR = Path("models")


def download_model(model_dir: str | Path = DEFAULT_MODEL_DIR) -> Path:
    """Download the MediaPipe pose landmarker model if it doesn't already exist."""
    model_dir = Path(model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "pose_landmarker_heavy.task"

    if not model_path.exists():
        print(f"Downloading pose landmarker model to {model_path}...")
        urllib.request.urlretrieve(POSE_MODEL_URL, model_path)
        print("Download complete.")

    return model_path


# ---------------------------------------------------------------------------
# Depth Anything V2 helpers
# ---------------------------------------------------------------------------

def _load_depth_model(
    model_name: str,
) -> tuple[Any, Any, str] | tuple[None, None, None]:
    """Load a Depth Anything V2 model via HuggingFace transformers.

    Returns (processor, model, device) on success, or (None, None, None) if
    torch/transformers are not installed.
    """
    try:
        import torch
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    except ImportError:
        print(
            "Warning: torch/transformers not installed — depth enhancement disabled. "
            "Install with: pip install torch torchvision transformers"
        )
        return None, None, None

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading depth model '{model_name}' on {device}…")
    processor = AutoImageProcessor.from_pretrained(model_name)
    model = AutoModelForDepthEstimation.from_pretrained(model_name).to(device)
    model.eval()
    print("Depth model ready.")
    return processor, model, device


def _estimate_depth(
    rgb_frame: np.ndarray,
    processor: Any,
    model: Any,
    device: str,
) -> np.ndarray:
    """Run Depth Anything V2 on one RGB frame; return an (H, W) float32 depth map.

    The model outputs inverse-depth / disparity values: higher value = closer
    to the camera.
    """
    import torch
    import torch.nn.functional as F
    from PIL import Image

    H, W = rgb_frame.shape[:2]
    inputs = processor(images=Image.fromarray(rgb_frame), return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        predicted_depth = model(**inputs).predicted_depth  # [1, H', W']

    depth = F.interpolate(
        predicted_depth.unsqueeze(1),
        size=(H, W),
        mode="bicubic",
        align_corners=False,
    ).squeeze().cpu().numpy()

    return depth.astype(np.float32)


def _sample_depth(depth_map: np.ndarray, lm: Landmark) -> float:
    H, W = depth_map.shape
    px = int(min(max(lm.x * W, 0), W - 1))
    py = int(min(max(lm.y * H, 0), H - 1))
    return float(depth_map[py, px])


def _apply_depth_z(
    landmarks: list[Landmark],
    depth_map: np.ndarray,
) -> list[Landmark]:
    """Replace each landmark's z with a value derived from the Depth Anything map.

    Convention: the model outputs disparity (higher = closer to camera).
    MediaPipe z convention: larger z = farther from camera.
    We therefore invert: z_new = (hip_depth − d) * scale, so landmarks
    closer to the camera than the hips get a negative z and landmarks
    behind the hips get a positive z.

    If the resulting depth looks front-to-back inverted, flip the sign of
    z_scale below.
    """
    pose_count = min(33, len(landmarks))
    pose_depths = np.array(
        [_sample_depth(depth_map, landmarks[i]) for i in range(pose_count)],
        dtype=np.float32,
    )

    hip_depth = float(
        (pose_depths[23] + pose_depths[24]) / 2.0
        if pose_count > 24
        else np.median(pose_depths)
    )

    depth_std = float(np.std(pose_depths))
    z_scale = 0.15 / (depth_std + 1e-6)

    result: list[Landmark] = []
    for lm in landmarks:
        if lm.visibility > 0:
            d = _sample_depth(depth_map, lm)
            z_new = float(np.clip((hip_depth - d) * z_scale, -1.0, 1.0))
            result.append(Landmark(x=lm.x, y=lm.y, z=z_new, visibility=lm.visibility))
        else:
            result.append(lm)
    return result


# ---------------------------------------------------------------------------
# Main extraction function
# ---------------------------------------------------------------------------

def extract_poses(
    video_path: str | Path,
    model_path: str | Path | None = None,
    start_s: float | None = None,
    stop_s: float | None = None,
    frame_stride: int = 5,
    enhance_depth: bool = False,
    depth_model_name: str = "depth-anything/Depth-Anything-V2-Small-hf",
) -> list[PoseFrame]:
    """Extract pose landmarks from a video file using MediaPipe.

    Args:
        video_path: Path to the video file.
        model_path: Path to the MediaPipe pose landmarker model.
        start_s / stop_s: Time range to process (seconds).
        frame_stride: Process every Nth frame.
        enhance_depth: Replace MediaPipe z with depth values from Depth
            Anything V2, giving more accurate 3-D depth.
        depth_model_name: HuggingFace model ID for Depth Anything V2.

    Returns:
        List of PoseFrame objects with 33 landmarks each.
    """
    if model_path is None:
        model_path = download_model()
    model_path = Path(model_path)

    start_ms = int(start_s * 1000) if start_s is not None else 0
    stop_ms = int(stop_s * 1000) if stop_s is not None else float("inf")

    pose_options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
    )

    # Load depth model once before the frame loop
    depth_processor, depth_model_hf, depth_device = (
        _load_depth_model(depth_model_name) if enhance_depth else (None, None, None)
    )

    poses: list[PoseFrame] = []
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    if start_s is not None and start_s > 0:
        start_frame = int(start_s * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        frame_idx = start_frame
    else:
        frame_idx = 0

    with mp.tasks.vision.PoseLandmarker.create_from_options(pose_options) as landmarker:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = int(1000 * frame_idx / fps)

            if timestamp_ms > stop_ms:
                break

            if frame_idx % frame_stride != 0:
                frame_idx += 1
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if result.pose_landmarks:
                landmarks: list[Landmark] = [
                    Landmark(
                        x=lm.x,
                        y=lm.y,
                        z=lm.z,
                        visibility=lm.visibility,
                    )
                    for lm in result.pose_landmarks[0]
                ]

                if depth_processor is not None:
                    depth_map = _estimate_depth(rgb, depth_processor, depth_model_hf, depth_device)
                    landmarks = _apply_depth_z(landmarks, depth_map)

                poses.append(PoseFrame(timestamp_ms=timestamp_ms, landmarks=landmarks))

            frame_idx += 1

    cap.release()
    return poses
