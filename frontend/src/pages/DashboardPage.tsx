import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';

export default function DashboardPage() {
  const sessions = useAppStore((s) => s.sessions);
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Pose Analysis Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analyze kinstretch movements with 3D pose tracking and angle measurement
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/webcam')}
          className="bg-surface-light border border-surface-lighter rounded-xl p-5 text-left hover:border-brand-500/50 transition-colors group"
        >
          <div className="text-brand-400 text-lg mb-1 group-hover:text-brand-300">Live Capture</div>
          <div className="text-xs text-gray-500">Use your webcam for real-time pose analysis</div>
        </button>
        <div className="bg-surface-light border border-surface-lighter rounded-xl p-5 text-left">
          <div className="text-blue-400 text-lg mb-1">Upload Video</div>
          <div className="text-xs text-gray-500">Upload an MP4/MOV file for analysis</div>
        </div>
        <div className="bg-surface-light border border-surface-lighter rounded-xl p-5 text-left">
          <div className="text-red-400 text-lg mb-1">YouTube Import</div>
          <div className="text-xs text-gray-500">Import a kinstretch video from YouTube</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="text-sm text-gray-600 bg-surface-light rounded-lg p-6 text-center border border-surface-lighter">
            No sessions yet. Create one from the sidebar to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/session/${s.id}`)}
                className="w-full flex items-center justify-between bg-surface-light border border-surface-lighter rounded-lg px-4 py-3 hover:border-gray-600 transition-colors"
              >
                <div className="text-sm text-gray-200">{s.title}</div>
                <div className="text-xs text-gray-500">
                  {s.video_count} video{s.video_count !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
