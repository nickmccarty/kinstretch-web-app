import { create } from 'zustand';
import type { Measurement, Session, Video } from '../types/api';
import type { PoseFrame } from '../types/pose';

interface AppState {
  // User (stub)
  userId: string | null;
  setUserId: (id: string) => void;

  // Sessions
  sessions: Session[];
  setSessions: (s: Session[]) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;

  // Videos
  videos: Video[];
  setVideos: (v: Video[]) => void;

  // Pose viewer state
  frames: PoseFrame[];
  setFrames: (f: PoseFrame[]) => void;
  currentFrameIndex: number;
  setCurrentFrameIndex: (i: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;

  // Angle measurement
  selectedEdges: [number, number][];
  addSelectedEdge: (edge: [number, number]) => void;
  setSelectedEdges: (edges: [number, number][]) => void;
  clearSelectedEdges: () => void;
  measuredAngle: {
    jointIndex: number;
    degrees: number;
    jointName: string;
    planeAngles?: { sagittal: number; frontal: number; transverse: number };
  } | null;
  setMeasuredAngle: (a: {
    jointIndex: number;
    degrees: number;
    jointName: string;
    planeAngles?: { sagittal: number; frontal: number; transverse: number };
  } | null) => void;
  pinnedPlane: 'sagittal' | 'frontal' | 'transverse' | null;
  setPinnedPlane: (p: 'sagittal' | 'frontal' | 'transverse' | null) => void;
  labelDragging: boolean;
  setLabelDragging: (v: boolean) => void;

  // Measurements history
  measurements: Measurement[];
  setMeasurements: (m: Measurement[]) => void;
  addMeasurement: (m: Measurement) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),

  sessions: [],
  setSessions: (sessions) => set({ sessions }),
  currentSessionId: null,
  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  videos: [],
  setVideos: (videos) => set({ videos }),

  frames: [],
  setFrames: (frames) => set({ frames, currentFrameIndex: 0 }),
  currentFrameIndex: 0,
  setCurrentFrameIndex: (i) => set({ currentFrameIndex: i }),
  isPlaying: false,
  setIsPlaying: (p) => set({ isPlaying: p }),

  selectedEdges: [],
  addSelectedEdge: (edge) =>
    set((state) => {
      const edges = [...state.selectedEdges, edge];
      if (edges.length > 2) return { selectedEdges: [edge] };
      return { selectedEdges: edges };
    }),
  setSelectedEdges: (edges) => set({ selectedEdges: edges }),
  clearSelectedEdges: () => set({ selectedEdges: [], measuredAngle: null, pinnedPlane: null }),
  measuredAngle: null,
  setMeasuredAngle: (a) => set({ measuredAngle: a }),
  pinnedPlane: null,
  setPinnedPlane: (p) => set({ pinnedPlane: p }),
  labelDragging: false,
  setLabelDragging: (v) => set({ labelDragging: v }),

  measurements: [],
  setMeasurements: (m) => set({ measurements: m }),
  addMeasurement: (m) => set((state) => ({ measurements: [m, ...state.measurements] })),
}));
