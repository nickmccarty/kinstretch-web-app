import { useWebcam } from '../../hooks/useWebcam';
import type { Landmark } from '../../types/pose';

interface Props {
  onFrame: (landmarks: Landmark[], frameIndex: number) => void;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function WebcamCapture({ onFrame, isActive: externalActive, onStart, onStop }: Props) {
  const { videoRef, canvasRef, landmarks, isActive, start, stop, frameIndex } = useWebcam();

  const handleStart = async () => {
    await start();
    onStart();
  };

  const handleStop = () => {
    stop();
    onStop();
  };

  // Forward landmarks to parent
  if (landmarks && isActive) {
    onFrame(landmarks, frameIndex);
  }

  return (
    <div className="relative">
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-auto"
          muted
          playsInline
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
            <button
              onClick={handleStart}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-brand-500"
            >
              Start Camera
            </button>
          </div>
        )}
      </div>
      {isActive && (
        <div className="absolute top-3 right-3">
          <button
            onClick={handleStop}
            className="bg-red-600/90 text-white text-xs px-3 py-1.5 rounded hover:bg-red-500"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
