// Mirrored from kinstretch/visualization.py POSE_CONNECTIONS
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

export const JOINT_NAMES: Record<number, string> = {
  0: 'Nose',
  1: 'Left Eye Inner', 2: 'Left Eye', 3: 'Left Eye Outer',
  4: 'Right Eye Inner', 5: 'Right Eye', 6: 'Right Eye Outer',
  7: 'Left Ear', 8: 'Right Ear',
  9: 'Mouth Left', 10: 'Mouth Right',
  11: 'Left Shoulder', 12: 'Right Shoulder',
  13: 'Left Elbow', 14: 'Right Elbow',
  15: 'Left Wrist', 16: 'Right Wrist',
  17: 'Left Pinky', 18: 'Right Pinky',
  19: 'Left Index', 20: 'Right Index',
  21: 'Left Thumb', 22: 'Right Thumb',
  23: 'Left Hip', 24: 'Right Hip',
  25: 'Left Knee', 26: 'Right Knee',
  27: 'Left Ankle', 28: 'Right Ankle',
  29: 'Left Heel', 30: 'Right Heel',
  31: 'Left Foot Index', 32: 'Right Foot Index',
};

// Major body joints useful for angle measurement
export const MEASURABLE_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

export const VISIBILITY_THRESHOLD = 0.3;

export type PlaneMovements = { sagittal: string; frontal: string; transverse: string };

/** Maps a measurable joint index to the clinical movement name for each anatomical plane. */
export const JOINT_PLANE_MOVEMENTS: Record<number, PlaneMovements> = {
  11: { sagittal: 'Flex / Ext',       frontal: 'Abd / Add',      transverse: 'Int / Ext Rot' }, // L Shoulder
  12: { sagittal: 'Flex / Ext',       frontal: 'Abd / Add',      transverse: 'Int / Ext Rot' }, // R Shoulder
  13: { sagittal: 'Flex / Ext',       frontal: 'Valgus / Varus', transverse: 'Rotation'      }, // L Elbow
  14: { sagittal: 'Flex / Ext',       frontal: 'Valgus / Varus', transverse: 'Rotation'      }, // R Elbow
  15: { sagittal: 'Flex / Ext',       frontal: 'Rad / Uln Dev',  transverse: 'Pron / Sup'    }, // L Wrist
  16: { sagittal: 'Flex / Ext',       frontal: 'Rad / Uln Dev',  transverse: 'Pron / Sup'    }, // R Wrist
  23: { sagittal: 'Flex / Ext',       frontal: 'Abd / Add',      transverse: 'Int / Ext Rot' }, // L Hip
  24: { sagittal: 'Flex / Ext',       frontal: 'Abd / Add',      transverse: 'Int / Ext Rot' }, // R Hip
  25: { sagittal: 'Flex / Ext',       frontal: 'Valgus / Varus', transverse: 'Int / Ext Rot' }, // L Knee
  26: { sagittal: 'Flex / Ext',       frontal: 'Valgus / Varus', transverse: 'Int / Ext Rot' }, // R Knee
  27: { sagittal: 'Dorsi / Plantar',  frontal: 'Inv / Ever',     transverse: 'Rotation'      }, // L Ankle
  28: { sagittal: 'Dorsi / Plantar',  frontal: 'Inv / Ever',     transverse: 'Rotation'      }, // R Ankle
};
