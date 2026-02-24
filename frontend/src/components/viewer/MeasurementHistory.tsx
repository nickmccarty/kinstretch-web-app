import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { listMeasurements, deleteMeasurement } from '../../services/api';
import { JOINT_NAMES } from '../../constants/skeleton';

interface Props {
  videoId: string;
}

export default function MeasurementHistory({ videoId }: Props) {
  const measurements = useAppStore((s) => s.measurements);
  const setMeasurements = useAppStore((s) => s.setMeasurements);
  const setCurrentFrameIndex = useAppStore((s) => s.setCurrentFrameIndex);
  const setSelectedEdges = useAppStore((s) => s.setSelectedEdges);
  const setPinnedPlane = useAppStore((s) => s.setPinnedPlane);

  useEffect(() => {
    listMeasurements({ video_id: videoId }).then(setMeasurements).catch(() => {});
  }, [videoId, setMeasurements]);

  const handleDelete = async (id: string) => {
    await deleteMeasurement(id);
    setMeasurements(measurements.filter((m) => m.id !== id));
  };

  if (measurements.length === 0) return null;

  return (
    <div className="bg-surface-light border-t border-surface-lighter px-4 py-3 max-h-48 overflow-y-auto">
      <div className="text-xs text-gray-500 font-semibold mb-2">Saved Measurements</div>
      <div className="space-y-1.5">
        {measurements.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between text-xs bg-surface rounded px-3 py-2 group"
          >
            <button
              onClick={() => {
                setPinnedPlane(null);
                setSelectedEdges([m.edge_a, m.edge_b]);
                setCurrentFrameIndex(m.frame_index);
              }}
              className="text-left hover:text-brand-400 transition-colors"
            >
              <span className="text-amber-400 font-mono font-bold">{m.angle_degrees.toFixed(1)}&deg;</span>
              <span className="text-gray-400 ml-2">
                {JOINT_NAMES[m.joint_index] || `Joint ${m.joint_index}`}
              </span>
              <span className="text-gray-600 ml-2">
                @ {(m.frame_timestamp_ms / 1000).toFixed(1)}s
              </span>
            </button>
            <button
              onClick={() => handleDelete(m.id)}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
