import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Landmark } from '../types/pose';
import { buildBodyFrame } from './helpers';

interface Props {
  landmarks: Landmark[];
}

const PLANES = [
  {
    key: 'sagittal',
    label: 'SAG',
    color: '#f59e0b',
    getAxis: (f: NonNullable<ReturnType<typeof buildBodyFrame>>) => f.right,
    getLabelOffset: (f: NonNullable<ReturnType<typeof buildBodyFrame>>, size: number) =>
      f.up.clone().multiplyScalar(size / 2 + 0.1),
  },
  {
    key: 'frontal',
    label: 'FRONT',
    color: '#38bdf8',
    getAxis: (f: NonNullable<ReturnType<typeof buildBodyFrame>>) => f.forward,
    getLabelOffset: (f: NonNullable<ReturnType<typeof buildBodyFrame>>, size: number) =>
      f.up.clone().multiplyScalar(size / 2 + 0.1),
  },
  {
    key: 'transverse',
    label: 'TRANS',
    color: '#4ade80',
    getAxis: (f: NonNullable<ReturnType<typeof buildBodyFrame>>) => f.up,
    getLabelOffset: (f: NonNullable<ReturnType<typeof buildBodyFrame>>, size: number) =>
      f.forward.clone().multiplyScalar(size / 2 + 0.1),
  },
] as const;

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const PLANE_SIZE = 2.8;
const PLANE_GEOMETRY = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);

export default function AnatomicalPlanes({ landmarks }: Props) {
  const bodyFrame = useMemo(() => buildBodyFrame(landmarks), [landmarks]);

  if (!bodyFrame) return null;

  return (
    <group>
      {PLANES.map(({ key, label, color, getAxis, getLabelOffset }) => {
        const normal = getAxis(bodyFrame);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, normal);
        const labelPos = bodyFrame.origin.clone().add(getLabelOffset(bodyFrame, PLANE_SIZE));

        return (
          <group key={key}>
            {/* Plane fill + border */}
            <group position={bodyFrame.origin} quaternion={quaternion}>
              <mesh>
                <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.07}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[PLANE_GEOMETRY]} />
                <lineBasicMaterial color={color} transparent opacity={0.28} />
              </lineSegments>
            </group>

            {/* Label in world space so it stays upright regardless of plane rotation */}
            <Html position={labelPos} center distanceFactor={6}>
              <div
                style={{
                  color,
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  border: `1px solid ${color}55`,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
