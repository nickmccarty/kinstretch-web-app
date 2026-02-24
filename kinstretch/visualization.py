from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from IPython.display import HTML, display

from kinstretch.models import Landmark, PoseFrame

# Full MediaPipe 33-landmark pose connections
POSE_CONNECTIONS: list[tuple[int, int]] = [
    # Face
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),
    (9, 10),
    # Torso
    (11, 12), (11, 23), (12, 24), (23, 24),
    # Left arm
    (11, 13), (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    # Right arm
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22), (18, 20),
    # Left leg
    (23, 25), (25, 27), (27, 29), (27, 31), (29, 31),
    # Right leg
    (24, 26), (26, 28), (28, 30), (28, 32), (30, 32),
]

VISIBILITY_THRESHOLD = 0.3


def _filter_by_time(
    poses: list[PoseFrame],
    start_s: float | None,
    stop_s: float | None,
) -> list[PoseFrame]:
    """Return the subset of poses within [start_s, stop_s] (in seconds)."""
    start_ms = int(start_s * 1000) if start_s is not None else 0
    stop_ms = int(stop_s * 1000) if stop_s is not None else float("inf")
    return [p for p in poses if start_ms <= p.timestamp_ms <= stop_ms]


def plot_pose(
    landmarks: list[Landmark],
    ax: plt.Axes | None = None,
    title: str | None = None,
    figsize: tuple[float, float] = (8, 10),
) -> plt.Figure | None:
    """Plot a single pose wireframe.

    Args:
        landmarks: List of 33 Landmark objects.
        ax: Matplotlib axes to draw on. If None, creates a new figure.
        title: Optional title for the plot.
        figsize: Figure size if creating a new figure.

    Returns:
        The Figure object if one was created, else None.
    """
    created_fig = False
    if ax is None:
        fig, ax = plt.subplots(1, 1, figsize=figsize)
        created_fig = True

    ax.set_xlim(-0.1, 1.1)
    ax.set_ylim(-0.1, 1.6)
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)

    xs = [lm.x for lm in landmarks]
    ys = [lm.y for lm in landmarks]

    for i, lm in enumerate(landmarks):
        color = "red" if lm.visibility > 0.5 else "lightgray"
        ax.plot(lm.x, lm.y, "o", color=color, markersize=8)
        ax.text(lm.x, lm.y - 0.03, str(i), ha="center", fontsize=6)

    for start, end in POSE_CONNECTIONS:
        if (landmarks[start].visibility > VISIBILITY_THRESHOLD
                and landmarks[end].visibility > VISIBILITY_THRESHOLD):
            ax.plot(
                [xs[start], xs[end]],
                [ys[start], ys[end]],
                "b-", alpha=0.6, lw=2,
            )

    ax.invert_yaxis()
    if title:
        ax.set_title(title)

    if created_fig:
        plt.tight_layout()
        return fig
    return None


def animate_poses(
    poses: list[PoseFrame],
    start_s: float | None = None,
    stop_s: float | None = None,
    interval: int = 200,
    save_path: str | Path | None = None,
    fps: int = 5,
    figsize: tuple[float, float] = (15, 6),
) -> FuncAnimation:
    """Animate a sequence of pose frames with 2D wireframe and 3D scatter views.

    Args:
        poses: List of PoseFrame objects.
        start_s: Start time in seconds. If None, starts from the beginning.
        stop_s: Stop time in seconds. If None, goes to the end.
        interval: Milliseconds between frames in the animation.
        save_path: If provided, save the animation to this path (e.g. .gif or .mp4).
        fps: Frames per second when saving.
        figsize: Figure size.

    Returns:
        The FuncAnimation object (keep a reference to prevent garbage collection).
    """
    poses = _filter_by_time(poses, start_s, stop_s)
    if not poses:
        raise ValueError(
            f"No poses found in range [{start_s}s, {stop_s}s]. "
            f"Video timestamps may not overlap with this range."
        )

    fig, (ax_2d, ax_3d) = plt.subplots(1, 2, figsize=figsize)

    def update(frame_idx: int) -> None:
        ax_2d.clear()
        ax_3d.clear()

        ax_2d.set_xlim(-0.1, 1.1)
        ax_2d.set_ylim(-0.1, 1.6)
        ax_2d.grid(True, alpha=0.3)

        ax_3d.set_xlim(-3, 3)
        ax_3d.set_ylim(-3, 3)
        ax_3d.grid(True, alpha=0.3)

        frame = poses[frame_idx]
        landmarks = frame.landmarks
        timestamp = frame.timestamp_ms / 1000

        # 2D wireframe
        xs = [lm.x for lm in landmarks]
        ys = [lm.y for lm in landmarks]

        for lm in landmarks:
            color = "red" if lm.visibility > 0.5 else "lightgray"
            ax_2d.plot(lm.x, lm.y, "o", color=color, markersize=8)

        for start, end in POSE_CONNECTIONS:
            if (landmarks[start].visibility > VISIBILITY_THRESHOLD
                    and landmarks[end].visibility > VISIBILITY_THRESHOLD):
                ax_2d.plot(
                    [xs[start], xs[end]],
                    [ys[start], ys[end]],
                    "b-", alpha=0.6, lw=2,
                )

        ax_2d.invert_yaxis()
        ax_2d.set_title(f"Frame {frame_idx} ({timestamp:.1f}s)")

        # 3D scatter (depth view)
        z_vals = [-lm.y for lm in landmarks]
        ax_3d.scatter(
            [lm.z for lm in landmarks],
            [lm.x for lm in landmarks],
            c=z_vals,
            cmap="viridis",
            s=50,
        )
        ax_3d.set_title("3D World Coordinates")
        ax_3d.set_xlabel("Z (depth)")
        ax_3d.set_ylabel("X")

    anim = FuncAnimation(fig, update, frames=len(poses), interval=interval, repeat=True)
    plt.tight_layout()

    if save_path:
        anim.save(str(save_path), writer="pillow", fps=fps)

    # Render as HTML5 video for Colab/Jupyter inline playback
    plt.close(fig)
    display(HTML(anim.to_html5_video()))

    return anim


def plot_joint_progression(
    poses: list[PoseFrame],
    joint_indices: list[int] | None = None,
    start_s: float | None = None,
    stop_s: float | None = None,
    figsize: tuple[float, float] = (12, 8),
) -> plt.Figure:
    """Plot X/Y trajectories of selected joints over time.

    Args:
        poses: List of PoseFrame objects.
        joint_indices: Landmark indices to plot. Defaults to shoulders and hips
            [11, 12, 23, 24].
        start_s: Start time in seconds. If None, starts from the beginning.
        stop_s: Stop time in seconds. If None, goes to the end.
        figsize: Figure size.

    Returns:
        The Figure object.
    """
    poses = _filter_by_time(poses, start_s, stop_s)
    if joint_indices is None:
        joint_indices = [11, 12, 23, 24]

    fig, axes = plt.subplots(2, 2, figsize=figsize)
    axes_flat = axes.ravel()

    joint_names = {
        11: "Left Shoulder", 12: "Right Shoulder",
        13: "Left Elbow", 14: "Right Elbow",
        15: "Left Wrist", 16: "Right Wrist",
        23: "Left Hip", 24: "Right Hip",
        25: "Left Knee", 26: "Right Knee",
        27: "Left Ankle", 28: "Right Ankle",
    }

    for i, joint_idx in enumerate(joint_indices[:4]):
        times, xs, ys = [], [], []
        for pose in poses:
            lm = pose.landmarks[joint_idx]
            times.append(pose.timestamp_ms / 1000)
            xs.append(lm.x)
            ys.append(lm.y)

        name = joint_names.get(joint_idx, f"Joint {joint_idx}")
        axes_flat[i].plot(times, xs, "o-", label="X", alpha=0.7, markersize=2)
        axes_flat[i].plot(times, ys, "s-", label="Y", alpha=0.7, markersize=2)
        axes_flat[i].set_title(name)
        axes_flat[i].set_xlabel("Time (s)")
        axes_flat[i].legend()

    plt.tight_layout()
    plt.show()
    return fig
