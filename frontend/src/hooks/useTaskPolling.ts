import { useEffect, useRef, useState } from 'react';
import { getVideoStatus } from '../services/api';
import type { TaskStatus } from '../types/api';

export function useTaskPolling(videoId: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!videoId || !enabled) return;

    const poll = async () => {
      try {
        const s = await getVideoStatus(videoId);
        setStatus(s);
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(intervalRef.current);
        }
      } catch {
        // Ignore polling errors
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => clearInterval(intervalRef.current);
  }, [videoId, enabled]);

  return status;
}
