import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { usePoseData } from '../../hooks/usePoseData';
import { useAngleMeasurement } from '../../hooks/useAngleMeasurement';
import PoseScene from '../../three/PoseScene';
import TimelineScrubber from './TimelineScrubber';
import MeasurementPanel from './MeasurementPanel';
import MeasurementHistory from './MeasurementHistory';
import JointAnalysisPanel from './JointAnalysisPanel';
import VideoPanel from './VideoPanel';
import type { Video } from '../../types/api';

interface Props {
  video: Video;
}

export default function PoseViewer({ video }: Props) {
  const { loading, error } = usePoseData(video.id);
  const frames = useAppStore((s) => s.frames);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const selectedEdges = useAppStore((s) => s.selectedEdges);
  const measuredAngle = useAppStore((s) => s.measuredAngle);
  const { handleEdgeClick, clearSelectedEdges } = useAngleMeasurement(video.id);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [showPlanes, setShowPlanes] = useState(false);

  const currentLandmarks = frames[currentFrameIndex]?.landmarks ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-brand-400 text-sm">
        Loading pose data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main canvas area: 3D viewer + video panel side-by-side */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 3D wireframe — 80% default, 50% when video expanded */}
        <div
          className="relative transition-[width] duration-300 ease-in-out"
          style={{ width: videoExpanded ? '50%' : '80%' }}
        >
          <PoseScene
            landmarks={currentLandmarks}
            selectedEdges={selectedEdges}
            onEdgeClick={handleEdgeClick}
            measuredAngle={measuredAngle}
            showPlanes={showPlanes}
          />

          {/* Anatomical planes toggle */}
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={() => setShowPlanes((v) => !v)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                showPlanes
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-black/40 text-gray-500 border border-white/10 hover:text-gray-300'
              }`}
            >
              Planes
            </button>
          </div>
        </div>

        {/* Video panel — 20% default, 50% when expanded */}
        <div
          className="flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden"
          style={{ width: videoExpanded ? '50%' : '20%' }}
        >
          <VideoPanel
            video={video}
            expanded={videoExpanded}
            onToggleExpand={() => setVideoExpanded((v) => !v)}
          />
        </div>
      </div>

      <TimelineScrubber />
      <MeasurementPanel
        videoId={video.id}
        sessionId={video.session_id}
        onClear={clearSelectedEdges}
      />
      <MeasurementHistory videoId={video.id} />
      <JointAnalysisPanel />
    </div>
  );
}
