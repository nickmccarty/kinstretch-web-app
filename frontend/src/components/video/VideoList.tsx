import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Video } from '../../types/api';
import { updateVideo } from '../../services/api';
import ProcessingStatus from './ProcessingStatus';

interface Props {
  videos: Video[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

function EditableTitle({ video, onSaved }: { video: Video; onSaved: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(video.title || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setValue(video.title || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    if (trimmed !== video.title) {
      await updateVideo(video.id, { title: trimmed });
      onSaved(trimmed);
    }
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="text-sm font-medium text-gray-200 bg-surface-lighter border border-brand-500/50 rounded px-1.5 py-0.5 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to rename"
      className="text-sm font-medium text-gray-200 truncate hover:text-white text-left group flex items-center gap-1"
    >
      {video.title || 'Untitled'}
      <svg
        className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
      </svg>
    </button>
  );
}

export default function VideoList({ videos, onRefresh }: Props) {
  const navigate = useNavigate();
  // Local title overrides so the UI updates instantly without a full refresh
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});

  if (videos.length === 0) {
    return <div className="text-sm text-gray-500 py-4">No videos yet. Upload or import one above.</div>;
  }

  return (
    <div className="space-y-3">
      {videos.map((v) => {
        const displayVideo = titleOverrides[v.id] ? { ...v, title: titleOverrides[v.id] } : v;
        return (
          <div
            key={v.id}
            className="bg-surface-light rounded-lg p-4 border border-surface-lighter hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <EditableTitle
                    video={displayVideo}
                    onSaved={(title) => setTitleOverrides(prev => ({ ...prev, [v.id]: title }))}
                  />
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[v.status]}`}>
                    {v.status}
                  </span>
                </div>
                {v.source_type === 'youtube' && v.creator && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{v.creator}</div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="capitalize">{v.source_type}</span>
                  {v.frame_count && <span>{v.frame_count} frames</span>}
                  {v.duration_ms && <span>{(v.duration_ms / 1000).toFixed(0)}s</span>}
                </div>
              </div>
              {v.status === 'completed' && (
                <button
                  onClick={() => navigate(`/viewer/${v.id}`)}
                  className="bg-brand-600 text-white text-xs px-3 py-1.5 rounded hover:bg-brand-500 shrink-0 ml-3"
                >
                  Open Viewer
                </button>
              )}
            </div>
            {(v.status === 'pending' || v.status === 'processing') && (
              <ProcessingStatus videoId={v.id} onComplete={onRefresh} />
            )}
          </div>
        );
      })}
    </div>
  );
}
