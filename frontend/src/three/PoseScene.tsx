import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useAppStore } from '../stores/appStore';
import type { Landmark } from '../types/pose';
import SkeletonRenderer from './SkeletonRenderer';
import AngleArc from './AngleArc';
import AnatomicalPlanes from './AnatomicalPlanes';
import GroundGrid from './GroundGrid';

interface Props {
  landmarks: Landmark[] | null;
  selectedEdges: [number, number][];
  onEdgeClick: (edge: [number, number]) => void;
  measuredAngle: {
    jointIndex: number;
    degrees: number;
    planeAngles?: { sagittal: number; frontal: number; transverse: number };
  } | null;
  showPlanes: boolean;
}

export default function PoseScene({ landmarks, selectedEdges, onEdgeClick, measuredAngle, showPlanes }: Props) {
  const labelDragging = useAppStore((s) => s.labelDragging);

  return (
    <Canvas
      camera={{ position: [0, 0.5, 3], fov: 50 }}
      style={{ background: '#0f172a' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />
      <Environment preset="night" />

      <GroundGrid />

      {landmarks && (
        <>
          {showPlanes && <AnatomicalPlanes landmarks={landmarks} />}

          <SkeletonRenderer
            landmarks={landmarks}
            selectedEdges={selectedEdges}
            onEdgeClick={onEdgeClick}
          />
          {measuredAngle && selectedEdges.length === 2 && (
            <AngleArc
              landmarks={landmarks}
              edgeA={selectedEdges[0]}
              edgeB={selectedEdges[1]}
              jointIndex={measuredAngle.jointIndex}
              angleDegrees={measuredAngle.degrees}
              planeAngles={measuredAngle.planeAngles}
            />
          )}
        </>
      )}

      <OrbitControls
        enabled={!labelDragging}
        enableDamping
        dampingFactor={0.1}
        minDistance={1}
        maxDistance={10}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
