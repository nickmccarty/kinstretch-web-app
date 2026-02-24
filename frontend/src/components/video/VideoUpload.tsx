import { useCallback, useState } from 'react';
import { uploadVideo } from '../../services/api';

interface Props {
  sessionId: string;
  onUploaded: () => void;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

function parseTime(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN) || parts.length < 2 || parts.length > 3) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoUpload({ sessionId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ file: File; duration: number | null } | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const duration = await readVideoDuration(file);
    setPending({ file, duration });
    setStartInput('');
    setEndInput(duration != null ? formatDuration(duration) : '');
    setError(null);
  }, []);

  const handleProcess = async () => {
    if (!pending) return;
    const startS = parseTime(startInput) ?? undefined;
    const endS = parseTime(endInput) ?? undefined;
    if (startS !== undefined && endS !== undefined && startS >= endS) {
      setError('Start must be before end');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await uploadVideo(sessionId, pending.file, undefined, startS, endS);
      setPending(null);
      onUploaded();
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // --- Step 2: file selected, configure slice ---
  if (pending) {
    const duration = pending.duration;
    const startS = parseTime(startInput) ?? 0;
    const endS = parseTime(endInput) ?? duration ?? 0;
    const pctLeft = duration ? (startS / duration) * 100 : 0;
    const pctRight = duration ? (1 - endS / duration) * 100 : 0;

    return (
      <div className="rounded-xl border border-surface-lighter bg-surface/40 p-4 space-y-3">
        {/* File info row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              <path d="M14 6l4 4-4 4V6z" />
            </svg>
            <span className="text-sm text-gray-200 truncate">{pending.file.name}</span>
            {duration != null && (
              <span className="text-xs text-gray-500 shrink-0">{formatDuration(duration)}</span>
            )}
          </div>
          <button
            onClick={() => setPending(null)}
            className="text-gray-600 hover:text-gray-400 text-lg leading-none shrink-0"
          >
            ×
          </button>
        </div>

        {/* Slice bar */}
        {duration != null && (
          <div className="relative h-1.5 bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-brand-500/70 rounded-full"
              style={{ left: `${pctLeft}%`, right: `${pctRight}%` }}
            />
          </div>
        )}

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Start</label>
            <input
              type="text"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              placeholder="0:00"
              className="w-full bg-surface text-gray-100 text-sm px-3 py-1.5 rounded border border-surface-lighter focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">End</label>
            <input
              type="text"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              placeholder={duration != null ? formatDuration(duration) : 'full'}
              className="w-full bg-surface text-gray-100 text-sm px-3 py-1.5 rounded border border-surface-lighter focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleProcess}
          disabled={uploading}
          className="w-full bg-brand-600 text-white text-sm py-2 rounded-lg hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload & Process'}
        </button>
      </div>
    );
  }

  // --- Step 1: drop zone ---
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragging
          ? 'border-brand-400 bg-brand-600/10'
          : 'border-surface-lighter hover:border-gray-500'
      }`}
    >
      <div className="text-gray-400 text-sm mb-2">
        Drag & drop a video file or{' '}
        <label className="text-brand-400 cursor-pointer hover:underline">
          browse
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>
      <div className="text-xs text-gray-600">MP4, MOV, AVI</div>
    </div>
  );
}
