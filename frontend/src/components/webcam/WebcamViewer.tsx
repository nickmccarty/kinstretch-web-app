import { useCallback, useRef, useState } from 'react';
import type { Landmark } from '../../types/pose';
import PoseScene from '../../three/PoseScene';
import WebcamCapture from './WebcamCapture';
import RecordingControls from './RecordingControls';
import { PoseStreamClient } from '../../services/websocket';
import { createWebcamVideo } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

interface Props {
  sessionId: string;
}

export default function WebcamViewer({ sessionId }: Props) {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [framesRecorded, setFramesRecorded] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const wsClientRef = useRef<PoseStreamClient>(new PoseStreamClient());
  const videoIdRef = useRef<string | null>(null);

  const handleFrame = useCallback(
    (lms: Landmark[], frameIndex: number) => {
      setLandmarks(lms);
      if (isRecording && wsClientRef.current.connected) {
        wsClientRef.current.sendFrame(frameIndex, Math.floor(performance.now()), lms);
        setFramesRecorded((prev) => prev + 1);
      }
    },
    [isRecording],
  );

  const handleStartRecording = async () => {
    const video = await createWebcamVideo(sessionId, `Webcam ${new Date().toLocaleString()}`);
    videoIdRef.current = video.id;

    wsClientRef.current.connect(video.id, (msg) => {
      if (msg.type === 'recording_stopped') {
        console.log(`Saved ${msg.frame_count} frames`);
      }
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (wsClientRef.current.connected) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    wsClientRef.current.startRecording();
    setIsRecording(true);
    setFramesRecorded(0);
  };

  const handleStopRecording = () => {
    wsClientRef.current.stopRecording();
    setIsRecording(false);
    // Disconnect after a brief delay to let the stop message arrive
    setTimeout(() => wsClientRef.current.disconnect(), 1000);
  };

  return (
    <div className="h-full flex gap-4 p-4">
      <div className="flex-1 flex flex-col gap-4">
        <WebcamCapture
          onFrame={handleFrame}
          isActive={isActive}
          onStart={() => setIsActive(true)}
          onStop={() => {
            setIsActive(false);
            if (isRecording) handleStopRecording();
          }}
        />
        {isActive && (
          <RecordingControls
            isRecording={isRecording}
            framesRecorded={framesRecorded}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}
      </div>
      <div className="flex-1 rounded-lg overflow-hidden border border-surface-lighter">
        <PoseScene
          landmarks={landmarks}
          selectedEdges={[]}
          onEdgeClick={() => {}}
          measuredAngle={null}
          showPlanes={false}
        />
      </div>
    </div>
  );
}
