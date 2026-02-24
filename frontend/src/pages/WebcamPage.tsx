import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { createSession } from '../services/api';
import WebcamViewer from '../components/webcam/WebcamViewer';

export default function WebcamPage() {
  const userId = useAppStore((s) => s.userId);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Auto-create a session for webcam recordings
  useEffect(() => {
    if (userId && !sessionId) {
      createSession(userId, `Webcam Session ${new Date().toLocaleDateString()}`)
        .then((s) => setSessionId(s.id))
        .catch(() => {});
    }
  }, [userId, sessionId]);

  if (!sessionId) {
    return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Setting up session...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 bg-surface-light border-b border-surface-lighter">
        <h1 className="text-sm font-medium text-gray-200">Real-Time Webcam Analysis</h1>
        <p className="text-xs text-gray-500">
          Start your camera to see live pose tracking. Record sessions to save and review later.
        </p>
      </div>
      <div className="flex-1">
        <WebcamViewer sessionId={sessionId} />
      </div>
    </div>
  );
}
