import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import { formatTimestamp } from '../../utils/time';

export default function TimelineScrubber() {
  const frames = useAppStore((s) => s.frames);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const setCurrentFrameIndex = useAppStore((s) => s.setCurrentFrameIndex);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const totalFrames = frames.length;
  const currentTime = frames[currentFrameIndex]?.timestamp_ms ?? 0;

  // Play/pause with interval
  useEffect(() => {
    if (isPlaying && totalFrames > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrameIndex(
          useAppStore.getState().currentFrameIndex + 1 >= totalFrames
            ? 0
            : useAppStore.getState().currentFrameIndex + 1,
        );
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, totalFrames, setCurrentFrameIndex]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentFrameIndex(Math.min(currentFrameIndex + 1, totalFrames - 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentFrameIndex(Math.max(currentFrameIndex - 1, 0));
      }
    },
    [isPlaying, currentFrameIndex, totalFrames, setIsPlaying, setCurrentFrameIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (totalFrames === 0) return null;

  return (
    <div className="bg-surface-light border-t border-surface-lighter px-4 py-3 flex items-center gap-4">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-8 h-8 flex items-center justify-center rounded bg-brand-600 hover:bg-brand-500 text-white text-sm"
      >
        {isPlaying ? '\u275A\u275A' : '\u25B6'}
      </button>

      <input
        type="range"
        min={0}
        max={totalFrames - 1}
        value={currentFrameIndex}
        onChange={(e) => setCurrentFrameIndex(Number(e.target.value))}
        className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
      />

      <div className="text-xs text-gray-400 font-mono whitespace-nowrap min-w-[180px] text-right">
        {formatTimestamp(currentTime)} &middot; Frame {currentFrameIndex + 1}/{totalFrames}
      </div>
    </div>
  );
}
