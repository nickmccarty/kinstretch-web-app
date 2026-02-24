import { PoseFrame } from './pose';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  video_count: number;
}

export interface Video {
  id: string;
  session_id: string;
  source_type: 'upload' | 'youtube' | 'webcam';
  url: string | null;
  file_path: string | null;
  title: string | null;
  creator: string | null;
  duration_ms: number | null;
  frame_count: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface TaskStatus {
  video_id: string;
  status: string;
  progress_pct: number;
  error: string | null;
}

export interface PoseDataResponse {
  video_id: string;
  frame_count: number;
  frames: PoseFrame[];
}

export interface AngleCalcRequest {
  video_id: string;
  frame_index: number;
  edge_a: [number, number];
  edge_b: [number, number];
}

export interface AngleCalcResponse {
  joint_index: number;
  angle_degrees: number;
  joint_name: string;
  edge_a_name: string;
  edge_b_name: string;
}

export interface Measurement {
  id: string;
  session_id: string;
  video_id: string;
  frame_index: number;
  frame_timestamp_ms: number;
  joint_index: number;
  edge_a: [number, number];
  edge_b: [number, number];
  angle_degrees: number;
  label: string | null;
  created_at: string;
}
