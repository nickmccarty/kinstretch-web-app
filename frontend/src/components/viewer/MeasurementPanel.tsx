import { useAppStore } from '../../stores/appStore';
import { createMeasurement } from '../../services/api';
import { JOINT_NAMES, JOINT_PLANE_MOVEMENTS } from '../../constants/skeleton';
import { formatTimestamp } from '../../utils/time';

interface Props {
  videoId: string;
  sessionId: string;
  onClear: () => void;
}

const PLANE_COLORS = {
  sagittal:   { text: '#f59e0b', border: 'rgba(245,158,11,0.6)'  },
  frontal:    { text: '#38bdf8', border: 'rgba(56,189,248,0.6)'  },
  transverse: { text: '#4ade80', border: 'rgba(74,222,128,0.6)'  },
};

const PLANE_LABELS: Record<string, string> = {
  sagittal:   'Sagittal',
  frontal:    'Frontal',
  transverse: 'Transverse',
};

type Plane = 'sagittal' | 'frontal' | 'transverse';

export default function MeasurementPanel({ videoId, sessionId, onClear }: Props) {
  const selectedEdges = useAppStore((s) => s.selectedEdges);
  const measuredAngle = useAppStore((s) => s.measuredAngle);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const frames = useAppStore((s) => s.frames);
  const addMeasurement = useAppStore((s) => s.addMeasurement);
  const pinnedPlane = useAppStore((s) => s.pinnedPlane);
  const setPinnedPlane = useAppStore((s) => s.setPinnedPlane);

  // Derived plane state — computed before handleSave so the closure captures them
  const planeAngles = measuredAngle?.planeAngles;
  const movements = measuredAngle ? JOINT_PLANE_MOVEMENTS[measuredAngle.jointIndex] : null;

  const dominantPlane: Plane | null = planeAngles
    ? (['sagittal', 'frontal', 'transverse'] as const).reduce((a, b) =>
        planeAngles[a] >= planeAngles[b] ? a : b
      )
    : null;

  // Active plane: user's pin takes priority, falls back to auto-dominant
  const activePlane = pinnedPlane ?? dominantPlane;

  const handleSave = async () => {
    if (!measuredAngle || selectedEdges.length !== 2) return;
    const frame = frames[currentFrameIndex];
    if (!frame) return;

    const movementLabel = activePlane && movements ? movements[activePlane] : null;

    const label = [
      measuredAngle.jointName,
      movementLabel ? `— ${movementLabel}` : '',
      `@ ${formatTimestamp(frame.timestamp_ms)}`,
    ].filter(Boolean).join(' ');

    const measurement = await createMeasurement({
      session_id: sessionId,
      video_id: videoId,
      frame_index: currentFrameIndex,
      frame_timestamp_ms: frame.timestamp_ms,
      joint_index: measuredAngle.jointIndex,
      edge_a: selectedEdges[0],
      edge_b: selectedEdges[1],
      angle_degrees: measuredAngle.degrees,
      label,
    });
    addMeasurement(measurement);
    onClear();
  };

  return (
    <div className="bg-surface-light border-t border-surface-lighter px-4 py-3">
      {selectedEdges.length === 0 && (
        <p className="text-xs text-gray-500">
          Click two adjacent bones to measure the angle at the shared joint.
        </p>
      )}

      {selectedEdges.length === 1 && (
        <p className="text-xs text-gray-400">
          First bone selected:{' '}
          <span className="text-brand-400">
            {JOINT_NAMES[selectedEdges[0][0]] || selectedEdges[0][0]} &mdash;{' '}
            {JOINT_NAMES[selectedEdges[0][1]] || selectedEdges[0][1]}
          </span>. Click a second adjacent bone.
        </p>
      )}

      {measuredAngle && (
        <div className="space-y-2">
          {/* Header row: joint name + raw 3D angle + action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-amber-400 text-lg font-mono font-bold">
                {measuredAngle.degrees.toFixed(1)}&deg;
              </span>
              <span className="text-xs text-gray-400">
                {measuredAngle.jointName}
              </span>
              {!planeAngles && (
                <span className="text-xs text-gray-600">3D angle</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-brand-600 text-white text-xs px-3 py-1.5 rounded hover:bg-brand-500"
              >
                Save
              </button>
              <button
                onClick={onClear}
                className="bg-surface text-gray-400 text-xs px-3 py-1.5 rounded hover:bg-surface-lighter"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Plane breakdown */}
          {planeAngles && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {(['sagittal', 'frontal', 'transverse'] as const).map((plane) => {
                const isActive = plane === activePlane;
                const isPinned = plane === pinnedPlane;
                const { text: color, border: borderColor } = PLANE_COLORS[plane];
                const movementName = movements?.[plane] ?? '—';
                const angle = planeAngles[plane];

                return (
                  <div
                    key={plane}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPinnedPlane(isPinned ? null : plane)}
                    onKeyDown={(e) => e.key === 'Enter' && setPinnedPlane(isPinned ? null : plane)}
                    className="flex items-center gap-3 px-3 py-1.5 transition-colors"
                    style={{
                      cursor: 'pointer',
                      background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderLeft: isActive ? `2px solid ${borderColor}` : '2px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(255,255,255,0.05)' : 'transparent';
                    }}
                  >
                    {/* Pin indicator dot */}
                    <span
                      style={{
                        display: 'block',
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isActive ? color : 'rgba(255,255,255,0.12)',
                        boxShadow: isPinned ? `0 0 6px ${color}` : 'none',
                        transition: 'background 0.15s, box-shadow 0.15s',
                      }}
                    />

                    {/* Plane name */}
                    <span
                      className="text-xs font-semibold font-mono w-20 shrink-0"
                      style={{ color: isActive ? color : 'rgba(156,163,175,0.7)' }}
                    >
                      {PLANE_LABELS[plane]}
                    </span>

                    {/* Movement name */}
                    <span className="text-xs flex-1 truncate" style={{ color: isActive ? 'rgba(156,163,175,0.9)' : 'rgba(107,114,128,0.8)' }}>
                      {movementName}
                    </span>

                    {/* Angle */}
                    <span
                      className="text-xs font-mono font-bold tabular-nums"
                      style={{ color: isActive ? color : 'rgba(156,163,175,0.6)' }}
                    >
                      {angle.toFixed(1)}&deg;
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
