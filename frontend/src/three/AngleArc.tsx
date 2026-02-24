import { useMemo, useState, useRef, useEffect } from 'react';
import { Line, Html } from '@react-three/drei';
import type { Landmark } from '../types/pose';
import { landmarkToVec3, createArcPoints, getOuterEndpoints, buildBodyFrame } from './helpers';
import { useAppStore } from '../stores/appStore';

interface Props {
  landmarks: Landmark[];
  edgeA: [number, number];
  edgeB: [number, number];
  jointIndex: number;
  angleDegrees: number;
  planeAngles?: { sagittal: number; frontal: number; transverse: number };
}

const PLANE_COLORS: Record<string, string> = {
  sagittal:   '#f59e0b',
  frontal:    '#38bdf8',
  transverse: '#4ade80',
};

const PLANE_LABELS: Record<string, string> = {
  sagittal:   'Sagittal',
  frontal:    'Frontal',
  transverse: 'Transverse',
};

const DEFAULT_COLOR = '#fbbf24';

export default function AngleArc({ landmarks, edgeA, edgeB, jointIndex, angleDegrees, planeAngles }: Props) {
  const pinnedPlane = useAppStore((s) => s.pinnedPlane);
  const setLabelDragging = useAppStore((s) => s.setLabelDragging);

  const dominantPlane = planeAngles
    ? (['sagittal', 'frontal', 'transverse'] as const).reduce((a, b) =>
        planeAngles[a] >= planeAngles[b] ? a : b
      )
    : null;

  const activePlane = pinnedPlane ?? dominantPlane;

  // Recompute arc geometry when the pinned plane changes — projected onto the
  // selected anatomical plane so the arc lies flat within it.
  const arcData = useMemo(() => {
    const jointPos = landmarkToVec3(landmarks[jointIndex]);
    const [outerAIdx, outerBIdx] = getOuterEndpoints(edgeA, edgeB, jointIndex);
    const outerAPos = landmarkToVec3(landmarks[outerAIdx]);
    const outerBPos = landmarkToVec3(landmarks[outerBIdx]);

    let arcA = outerAPos;
    let arcB = outerBPos;

    if (pinnedPlane) {
      const bodyFrame = buildBodyFrame(landmarks);
      if (bodyFrame) {
        const normal = {
          sagittal:   bodyFrame.right,
          frontal:    bodyFrame.forward,
          transverse: bodyFrame.up,
        }[pinnedPlane];

        const va = outerAPos.clone().sub(jointPos);
        const vb = outerBPos.clone().sub(jointPos);

        // Remove the component of each bone along the plane normal
        const projA = va.clone().sub(normal.clone().multiplyScalar(va.dot(normal)));
        const projB = vb.clone().sub(normal.clone().multiplyScalar(vb.dot(normal)));

        // Only use projections if both are non-degenerate
        if (projA.length() > 1e-4 && projB.length() > 1e-4) {
          arcA = jointPos.clone().add(projA);
          arcB = jointPos.clone().add(projB);
        }
      }
    }

    const points = createArcPoints(jointPos, arcA, arcB);
    const midPoint = points[Math.floor(points.length / 2)];
    const bisector = midPoint.clone().sub(jointPos).normalize();
    const labelPos = jointPos.clone().addScaledVector(bisector, 0.28);
    return { points, labelPos };
  }, [landmarks, edgeA, edgeB, jointIndex, pinnedPlane]);

  // Visual style derived from the active plane
  const arcColor   = pinnedPlane ? PLANE_COLORS[pinnedPlane] : DEFAULT_COLOR;
  const labelAngle = pinnedPlane && planeAngles ? planeAngles[pinnedPlane] : angleDegrees;
  const labelColor = arcColor;
  const borderColor = pinnedPlane
    ? `${PLANE_COLORS[pinnedPlane]}59`   // plane color at ~35% opacity
    : 'rgba(251,191,36,0.35)';

  // Drag state: pixel offset from the 3D anchor point
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null);

  // Reset drag position when the measurement changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [jointIndex, edgeA, edgeB]);

  const handleGrabMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setLabelDragging(true);
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, offsetX: offset.x, offsetY: offset.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragOrigin.current) return;
      setOffset({
        x: dragOrigin.current.offsetX + ev.clientX - dragOrigin.current.mouseX,
        y: dragOrigin.current.offsetY + ev.clientY - dragOrigin.current.mouseY,
      });
    };
    const onUp = () => {
      setDragging(false);
      setLabelDragging(false);
      dragOrigin.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <group>
      <Line points={arcData.points} color={arcColor} lineWidth={3} />

      <Html position={arcData.labelPos} center distanceFactor={4}>
        <div
          className="flex items-center rounded-lg text-sm font-mono whitespace-nowrap select-none"
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${borderColor}`,
            color: labelColor,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            cursor: dragging ? 'grabbing' : 'default',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          <span className="px-2.5 py-1">
            {labelAngle.toFixed(1)}&deg;
            {activePlane && (
              <span style={{ opacity: 0.6, fontSize: '0.8em', marginLeft: '0.4em' }}>
                {PLANE_LABELS[activePlane]}
              </span>
            )}
          </span>

          {/* Drag handle */}
          <span
            onMouseDown={handleGrabMouseDown}
            className="flex flex-col items-center justify-center gap-[3px] px-1.5 py-1 border-l self-stretch rounded-r-lg"
            style={{
              borderColor: `${arcColor}33`,
              cursor: dragging ? 'grabbing' : 'grab',
            }}
            title="Drag to reposition"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: `${arcColor}80`,
                }}
              />
            ))}
          </span>
        </div>
      </Html>
    </group>
  );
}
