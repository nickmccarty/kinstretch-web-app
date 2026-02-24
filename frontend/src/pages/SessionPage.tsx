import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, listVideos, deleteSession } from '../services/api';
import { useAppStore } from '../stores/appStore';
import type { Session, Video } from '../types/api';
import VideoUpload from '../components/video/VideoUpload';
import YouTubeImport from '../components/video/YouTubeImport';
import VideoList from '../components/video/VideoList';

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const setCurrentSessionId = useAppStore((s) => s.setCurrentSessionId);
  const setSessions = useAppStore((s) => s.setSessions);
  const sessions = useAppStore((s) => s.sessions);
  const [session, setSession] = useState<Session | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const [s, v] = await Promise.all([
      getSession(sessionId),
      listVideos(sessionId),
    ]);
    setSession(s);
    setVideos(v);
  }, [sessionId]);

  useEffect(() => {
    setCurrentSessionId(sessionId || null);
    refresh();
  }, [sessionId, setCurrentSessionId, refresh]);

  const handleDelete = async () => {
    if (!session) return;
    await deleteSession(session.id);
    setSessions(sessions.filter((s) => s.id !== session.id));
    setCurrentSessionId(null);
    navigate('/');
  };

  if (!session) {
    return <div className="p-8 text-gray-500 text-sm">Loading session...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-1 gap-4">
        <h1 className="text-xl font-bold text-gray-100">{session.title}</h1>

        {/* Delete session */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">Delete this session?</span>
            <button
              onClick={handleDelete}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-400/50 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors mt-1"
            title="Delete session"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete session
          </button>
        )}
      </div>

      {session.notes && (
        <p className="text-sm text-gray-500 mb-6">{session.notes}</p>
      )}

      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold text-gray-400">Add Video</h2>
        <VideoUpload sessionId={session.id} onUploaded={refresh} />
        <YouTubeImport sessionId={session.id} onImported={refresh} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Videos</h2>
        <VideoList videos={videos} onRefresh={refresh} />
      </div>
    </div>
  );
}
