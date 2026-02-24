import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { listSessions, createSession, deleteSession } from '../../services/api';

export default function Sidebar() {
  const sessions = useAppStore((s) => s.sessions);
  const setSessions = useAppStore((s) => s.setSessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const setCurrentSessionId = useAppStore((s) => s.setCurrentSessionId);
  const userId = useAppStore((s) => s.userId);
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      listSessions(userId).then(setSessions).catch(() => {});
    }
  }, [userId, setSessions]);

  const handleCreate = async () => {
    if (!userId || !newTitle.trim()) return;
    const session = await createSession(userId, newTitle.trim());
    setSessions([session, ...sessions]);
    setNewTitle('');
    setShowNew(false);
    navigate(`/session/${session.id}`);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions(sessions.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      navigate('/');
    }
  };

  return (
    <aside className="w-64 bg-surface-light border-r border-surface-lighter flex flex-col shrink-0">
      <div className="p-4 border-b border-surface-lighter flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">Sessions</span>
        <button
          onClick={() => setShowNew(!showNew)}
          className="text-brand-400 hover:text-brand-300 text-xl leading-none"
        >
          +
        </button>
      </div>

      {showNew && (
        <div className="p-3 border-b border-surface-lighter">
          <input
            type="text"
            placeholder="Session title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="w-full bg-surface text-gray-100 text-sm px-3 py-2 rounded border border-surface-lighter focus:outline-none focus:border-brand-500"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-brand-600 text-white text-xs py-1.5 rounded hover:bg-brand-500"
            >
              Create
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="flex-1 bg-surface text-gray-400 text-xs py-1.5 rounded hover:bg-surface-lighter"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group relative flex items-stretch border-b border-surface-lighter/50 transition-colors ${
              currentSessionId === s.id
                ? 'bg-brand-600/10 border-l-2 border-l-brand-500'
                : 'hover:bg-surface-lighter/50'
            }`}
          >
            {/* Session nav button */}
            <button
              onClick={() => { setConfirmDeleteId(null); navigate(`/session/${s.id}`); }}
              className="flex-1 text-left px-4 py-3 min-w-0"
            >
              <div className="text-sm text-gray-200 truncate">{s.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {s.video_count} video{s.video_count !== 1 ? 's' : ''}
              </div>
            </button>

            {/* Inline delete / confirm */}
            {confirmDeleteId === s.id ? (
              <div className="flex items-center gap-1 pr-2 shrink-0">
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded border border-red-500/30 hover:border-red-400/50 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                className="opacity-0 group-hover:opacity-100 flex items-center pr-3 text-gray-600 hover:text-red-400 transition-all"
                title="Delete session"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No sessions yet
          </div>
        )}
      </div>
    </aside>
  );
}
