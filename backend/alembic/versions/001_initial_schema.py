"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Sessions
    op.create_table(
        "sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_sessions_user_id", "sessions", ["user_id"])

    # Videos
    op.create_table(
        "videos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("url", sa.Text),
        sa.Column("file_path", sa.Text),
        sa.Column("title", sa.String(500)),
        sa.Column("creator", sa.String(255)),
        sa.Column("duration_ms", sa.Integer),
        sa.Column("frame_count", sa.Integer),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_videos_session_id", "videos", ["session_id"])

    # Pose frames
    op.create_table(
        "pose_frames",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("video_id", UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frame_index", sa.Integer, nullable=False),
        sa.Column("timestamp_ms", sa.Integer, nullable=False),
        sa.Column("landmarks", JSONB, nullable=False),
        sa.UniqueConstraint("video_id", "frame_index"),
    )
    op.create_index("idx_pose_frames_video_id", "pose_frames", ["video_id"])
    op.create_index("idx_pose_frames_video_ts", "pose_frames", ["video_id", "timestamp_ms"])

    # Measurements
    op.create_table(
        "measurements",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("video_id", UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frame_index", sa.Integer, nullable=False),
        sa.Column("frame_timestamp_ms", sa.Integer, nullable=False),
        sa.Column("joint_index", sa.Integer, nullable=False),
        sa.Column("edge_a", ARRAY(sa.Integer), nullable=False),
        sa.Column("edge_b", ARRAY(sa.Integer), nullable=False),
        sa.Column("angle_degrees", sa.Float, nullable=False),
        sa.Column("label", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_measurements_session_id", "measurements", ["session_id"])
    op.create_index("idx_measurements_video_id", "measurements", ["video_id"])


def downgrade() -> None:
    op.drop_table("measurements")
    op.drop_table("pose_frames")
    op.drop_table("videos")
    op.drop_table("sessions")
    op.drop_table("users")
    pass  # no enum to drop
