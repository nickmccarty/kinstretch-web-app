import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVideo } from '../services/api';
import type { Video } from '../types/api';
import PoseViewer from '../components/viewer/PoseViewer';

export default function ViewerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [video, setVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (videoId) {
      getVideo(videoId).then(setVideo).catch(() => {});
    }
  }, [videoId]);

  if (!video) {
    return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 bg-surface-light border-b border-surface-lighter flex items-center gap-3">
        <h1 className="text-sm font-medium text-gray-200 truncate">{video.title || 'Untitled'}</h1>
        {video.creator && (
          <span className="text-xs text-gray-500">by {video.creator}</span>
        )}
        {video.duration_ms && (
          <span className="text-xs text-gray-600 ml-auto">{(video.duration_ms / 1000).toFixed(0)}s</span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <PoseViewer video={video} />
      </div>
    </div>
  );
}
