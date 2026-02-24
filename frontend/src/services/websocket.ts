import type { Landmark } from '../types/pose';

export type WSMessage =
  | { type: 'ack'; frames_received: number }
  | { type: 'recording_started' }
  | { type: 'recording_stopped'; frame_count: number; duration_ms: number }
  | { type: 'error'; message: string };

export class PoseStreamClient {
  private ws: WebSocket | null = null;
  private onMessage: ((msg: WSMessage) => void) | null = null;

  connect(videoId: string, onMessage: (msg: WSMessage) => void): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/pose-stream/${videoId}`;
    this.ws = new WebSocket(url);
    this.onMessage = onMessage;

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as WSMessage;
      this.onMessage?.(data);
    };
  }

  sendFrame(frameIndex: number, timestampMs: number, landmarks: Landmark[]): void {
    this.ws?.send(JSON.stringify({
      type: 'pose_frame',
      frame_index: frameIndex,
      timestamp_ms: timestampMs,
      landmarks,
    }));
  }

  startRecording(): void {
    this.ws?.send(JSON.stringify({ type: 'start_recording' }));
  }

  stopRecording(): void {
    this.ws?.send(JSON.stringify({ type: 'stop_recording' }));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
