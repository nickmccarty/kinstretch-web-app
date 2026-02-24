import { useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { Video } from '../../types/api';

interface Props {
  video: Video;
  expanded: boolean;
  onToggleExpand: () => void;
}

/** Convert a backend file_path (e.g. "uploads/abc.mp4") to a servable URL. */
function getVideoSrc(video: Video): string | null {
  if (video.file_path) {
    const filename = video.file_path.replace(/\\/g, '/').split('/').pop();
    return `/uploads/${filename}`;
  }
  return null;
}

export default function VideoPanel({ video, expanded, onToggleExpand }: Props) {
  const frames = useAppStore((s) => s.frames);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const videoRef = useRef<HTMLVideoElement>(null);

  const src = getVideoSrc(video);
  const currentTimeMs = frames[currentFrameIndex]?.timestamp_ms ?? 0;

  // Keep video element scrubbed to the current pose frame timestamp.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const target = currentTimeMs / 1000;
    // Only seek when meaningfully different to avoid thrashing during load.
    if (Math.abs(el.currentTime - target) > 0.05) {
      el.currentTime = target;
    }
  }, [currentTimeMs]);

  return (
    <div className="flex flex-col h-full bg-black border-l border-surface-lighter">
      {/* Panel header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-light border-b border-surface-lighter shrink-0 gap-2">
        <span className="text-xs text-gray-400 font-medium truncate min-w-0">
          {video.title ?? 'Original Video'}
        </span>
        <button
          onClick={onToggleExpand}
          title={expanded ? 'Collapse to thumbnail' : 'Expand side-by-side'}
          className="shrink-0 text-gray-500 hover:text-gray-200 transition-colors"
        >
          {expanded ? (
            /* Compress / collapse icon */
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h3V6a1 1 0 112 0v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 01-1-1z" clipRule="evenodd" transform="rotate(45 10 10)" />
              <path d="M3 4a1 1 0 011-1h3v2H5v2H3V4zM17 4a1 1 0 00-1-1h-3v2h2v2h2V4zM3 16a1 1 0 001 1h3v-2H5v-2H3v3zM17 16a1 1 0 01-1 1h-3v-2h2v-2h2v3z" />
            </svg>
          ) : (
            /* Expand icon */
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Video / placeholder */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="absolute inset-0 w-full h-full object-contain"
            preload="auto"
            muted
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs text-center px-3">
            No video preview available
          </div>
        )}
      </div>
    </div>
  );
}
