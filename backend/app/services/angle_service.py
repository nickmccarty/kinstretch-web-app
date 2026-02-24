from __future__ import annotations

import math

import numpy as np

JOINT_NAMES: dict[int, str] = {
    0: "Nose",
    1: "Left Eye Inner", 2: "Left Eye", 3: "Left Eye Outer",
    4: "Right Eye Inner", 5: "Right Eye", 6: "Right Eye Outer",
    7: "Left Ear", 8: "Right Ear",
    9: "Mouth Left", 10: "Mouth Right",
    11: "Left Shoulder", 12: "Right Shoulder",
    13: "Left Elbow", 14: "Right Elbow",
    15: "Left Wrist", 16: "Right Wrist",
    17: "Left Pinky", 18: "Right Pinky",
    19: "Left Index", 20: "Right Index",
    21: "Left Thumb", 22: "Right Thumb",
    23: "Left Hip", 24: "Right Hip",
    25: "Left Knee", 26: "Right Knee",
    27: "Left Ankle", 28: "Right Ankle",
    29: "Left Heel", 30: "Right Heel",
    31: "Left Foot Index", 32: "Right Foot Index",
}


def find_shared_joint(edge_a: list[int], edge_b: list[int]) -> int | None:
    shared = set(edge_a) & set(edge_b)
    if len(shared) != 1:
        return None
    return shared.pop()


def calculate_angle(
    landmarks: list[dict],
    edge_a: list[int],
    edge_b: list[int],
) -> tuple[int, float]:
    """Calculate the angle between two bone segments at their shared joint.

    Args:
        landmarks: List of 33 dicts with x, y, z, visibility.
        edge_a: [landmark_idx_1, landmark_idx_2] defining the first bone.
        edge_b: [landmark_idx_3, landmark_idx_4] defining the second bone.

    Returns:
        (joint_index, angle_degrees)

    Raises:
        ValueError: If edges don't share exactly one joint.
    """
    joint_idx = find_shared_joint(edge_a, edge_b)
    if joint_idx is None:
        raise ValueError(f"Edges {edge_a} and {edge_b} do not share exactly one joint.")

    outer_a = edge_a[0] if edge_a[1] == joint_idx else edge_a[1]
    outer_b = edge_b[0] if edge_b[1] == joint_idx else edge_b[1]

    j = np.array([landmarks[joint_idx]["x"], landmarks[joint_idx]["y"], landmarks[joint_idx]["z"]])
    a = np.array([landmarks[outer_a]["x"], landmarks[outer_a]["y"], landmarks[outer_a]["z"]])
    b = np.array([landmarks[outer_b]["x"], landmarks[outer_b]["y"], landmarks[outer_b]["z"]])

    va = a - j
    vb = b - j

    cos_angle = np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb) + 1e-10)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    angle_deg = math.degrees(math.acos(float(cos_angle)))

    return joint_idx, angle_deg


def get_edge_name(edge: list[int]) -> str:
    return f"{JOINT_NAMES.get(edge[0], f'Joint {edge[0]}')} - {JOINT_NAMES.get(edge[1], f'Joint {edge[1]}')}"
