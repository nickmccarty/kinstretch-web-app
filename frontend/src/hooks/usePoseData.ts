import { useEffect, useState } from 'react';
import { getPoses } from '../services/api';
import { useAppStore } from '../stores/appStore';

export function usePoseData(videoId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setFrames = useAppStore((s) => s.setFrames);

  useEffect(() => {
    if (!videoId) return;

    setLoading(true);
    setError(null);

    getPoses(videoId)
      .then((data) => {
        setFrames(data.frames);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load pose data');
      })
      .finally(() => setLoading(false));
  }, [videoId, setFrames]);

  return { loading, error };
}
