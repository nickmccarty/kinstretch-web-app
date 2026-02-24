import { useCallback, useEffect, useRef, useState } from 'react';
import type { Landmark } from '../types/pose';

interface UseWebcamResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  landmarks: Landmark[] | null;
  isActive: boolean;
  start: () => Promise<void>;
  stop: () => void;
  frameIndex: number;
}

export function useWebcam(): UseWebcamResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isActive, setIsActive] = useState(false);
  const landmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const frameIndexRef = useRef(0);
  const [frameIndex, setFrameIndex] = useState(0);

  const start = useCallback(async () => {
    try {
      // Get camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Load MediaPipe
      const vision = await import('@mediapipe/tasks-vision');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );
      landmarkerRef.current = await vision.PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      setIsActive(true);

      // Detection loop
      const detect = () => {
        if (!videoRef.current || !landmarkerRef.current) return;
        if (videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        const result = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        if (result.landmarks && result.landmarks.length > 0) {
          const lms: Landmark[] = result.landmarks[0].map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? 1,
          }));
          setLandmarks(lms);
          frameIndexRef.current += 1;
          setFrameIndex(frameIndexRef.current);

          // Draw overlay on canvas
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const w = canvasRef.current.width;
              const h = canvasRef.current.height;
              ctx.clearRect(0, 0, w, h);
              ctx.fillStyle = '#14b8a6';
              for (const lm of lms) {
                if (lm.visibility > 0.3) {
                  ctx.beginPath();
                  ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.error('Webcam start failed:', err);
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setIsActive(false);
    setLandmarks(null);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, canvasRef, landmarks, isActive, start, stop, frameIndex };
}
