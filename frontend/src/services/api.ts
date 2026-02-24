import axios from 'axios';
import type {
  AngleCalcRequest,
  AngleCalcResponse,
  Measurement,
  PoseDataResponse,
  Session,
  TaskStatus,
  User,
  Video,
} from '../types/api';

const api = axios.create({ baseURL: '/api' });

// Users
export const createUser = (email: string, name: string) =>
  api.post<User>('/users', { email, name }).then(r => r.data);

export const getUser = (id: string) =>
  api.get<User>(`/users/${id}`).then(r => r.data);

export const listUsers = () =>
  api.get<User[]>('/users').then(r => r.data);

// Sessions
export const createSession = (userId: string, title: string, notes?: string) =>
  api.post<Session>('/sessions', { user_id: userId, title, notes }).then(r => r.data);

export const listSessions = (userId?: string) =>
  api.get<Session[]>('/sessions', { params: userId ? { user_id: userId } : {} }).then(r => r.data);

export const getSession = (id: string) =>
  api.get<Session>(`/sessions/${id}`).then(r => r.data);

export const updateSession = (id: string, data: { title?: string; notes?: string }) =>
  api.patch<Session>(`/sessions/${id}`, data).then(r => r.data);

export const deleteSession = (id: string) =>
  api.delete(`/sessions/${id}`);

// Videos
export const uploadVideo = (sessionId: string, file: File, title?: string, startS?: number, stopS?: number) => {
  const form = new FormData();
  form.append('session_id', sessionId);
  form.append('file', file);
  if (title) form.append('title', title);
  if (startS !== undefined) form.append('start_s', String(startS));
  if (stopS !== undefined) form.append('stop_s', String(stopS));
  return api.post<Video>('/videos/upload', form).then(r => r.data);
};

export const importYouTube = (sessionId: string, url: string, title?: string, startS?: number, stopS?: number) =>
  api.post<Video>('/videos/youtube', { session_id: sessionId, url, title, start_s: startS, stop_s: stopS }).then(r => r.data);

export const createWebcamVideo = (sessionId: string, title?: string) =>
  api.post<Video>('/videos/webcam', { session_id: sessionId, title }).then(r => r.data);

export const listVideos = (sessionId?: string) =>
  api.get<Video[]>('/videos', { params: sessionId ? { session_id: sessionId } : {} }).then(r => r.data);

export const getVideo = (id: string) =>
  api.get<Video>(`/videos/${id}`).then(r => r.data);

export const getVideoStatus = (id: string) =>
  api.get<TaskStatus>(`/videos/${id}/status`).then(r => r.data);

export const updateVideo = (id: string, data: { title?: string }) =>
  api.patch<Video>(`/videos/${id}`, data).then(r => r.data);

export const deleteVideo = (id: string) =>
  api.delete(`/videos/${id}`);

// Poses
export const getPoses = (videoId: string, params?: { start_ms?: number; stop_ms?: number; stride?: number }) =>
  api.get<PoseDataResponse>(`/videos/${videoId}/poses`, { params }).then(r => r.data);

export const getSingleFrame = (videoId: string, frameIndex: number) =>
  api.get<PoseDataResponse['frames'][0]>(`/videos/${videoId}/poses/${frameIndex}`).then(r => r.data);

// Measurements
export const calculateAngle = (data: AngleCalcRequest) =>
  api.post<AngleCalcResponse>('/measurements/calculate', data).then(r => r.data);

export const createMeasurement = (data: {
  session_id: string;
  video_id: string;
  frame_index: number;
  frame_timestamp_ms: number;
  joint_index: number;
  edge_a: [number, number];
  edge_b: [number, number];
  angle_degrees: number;
  label?: string;
}) => api.post<Measurement>('/measurements', data).then(r => r.data);

export const listMeasurements = (params?: { session_id?: string; video_id?: string }) =>
  api.get<Measurement[]>('/measurements', { params }).then(r => r.data);

export const deleteMeasurement = (id: string) =>
  api.delete(`/measurements/${id}`);
