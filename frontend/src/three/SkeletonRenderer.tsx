import { useCallback } from 'react';
import type { Landmark } from '../types/pose';
import { POSE_CONNECTIONS, VISIBILITY_THRESHOLD } from '../constants/skeleton';
import { landmarkToVec3, buildCylinderTransform } from './helpers';

interface Props {
  landmarks: Landmark[];
  selectedEdges: [number, number][];
  onEdgeClick: (edge: [number, number]) => void;
}

export default function SkeletonRenderer({ landmarks, selectedEdges, onEdgeClick }: Props) {
  // Always use exactly 33 pose landmarks — ignore any extra data from older
  // extractions that included hand landmarks (indices 33-74).
  const poseLandmarks = landmarks.slice(0, 33);
  const joints = poseLandmarks.map(landmarkToVec3);

  const isEdgeSelected = useCallback(
    (a: number, b: number) =>
      selectedEdges.some(
        (e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a),
      ),
    [selectedEdges],
  );

  return (
    <group>
      {/* Joint spheres */}
      {joints.map((pos, i) => (
        <mesh key={`joint-${i}`} position={pos}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial
            color={poseLandmarks[i].visibility > 0.5 ? '#14b8a6' : '#475569'}
            emissive={poseLandmarks[i].visibility > 0.5 ? '#0d9488' : '#000000'}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}

      {/* Bone cylinders */}
      {POSE_CONNECTIONS.map(([a, b], i) => {
        if (
          poseLandmarks[a].visibility < VISIBILITY_THRESHOLD ||
          poseLandmarks[b].visibility < VISIBILITY_THRESHOLD
        )
          return null;

        const { position, quaternion, length } = buildCylinderTransform(joints[a], joints[b]);
        if (length < 0.001) return null;
        const selected = isEdgeSelected(a, b);

        return (
          <mesh
            key={`bone-${i}`}
            position={position}
            quaternion={quaternion}
            onClick={(e) => {
              e.stopPropagation();
              onEdgeClick([a, b]);
            }}
          >
            <cylinderGeometry args={[0.008, 0.008, length, 8]} />
            <meshStandardMaterial
              color={selected ? '#f43f5e' : '#0ea5e9'}
              emissive={selected ? '#e11d48' : '#0284c7'}
              emissiveIntensity={selected ? 0.5 : 0.15}
            />
          </mesh>
        );
      })}
    </group>
  );
}
