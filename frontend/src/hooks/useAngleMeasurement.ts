import { useCallback, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { calculateAngle } from '../services/api';
import {
  findSharedJoint,
  getOuterEndpoints,
  landmarkToVec3,
  calcAngleBetweenSegments,
  buildBodyFrame,
  getPlaneAngles,
} from '../three/helpers';
import { JOINT_NAMES } from '../constants/skeleton';

export function useAngleMeasurement(videoId: string | null) {
  const selectedEdges = useAppStore((s) => s.selectedEdges);
  const addSelectedEdge = useAppStore((s) => s.addSelectedEdge);
  const clearSelectedEdges = useAppStore((s) => s.clearSelectedEdges);
  const setMeasuredAngle = useAppStore((s) => s.setMeasuredAngle);
  const currentFrameIndex = useAppStore((s) => s.currentFrameIndex);
  const frames = useAppStore((s) => s.frames);

  // When 2 edges are selected, calculate the angle
  useEffect(() => {
    if (selectedEdges.length !== 2 || !videoId) return;

    const [edgeA, edgeB] = selectedEdges;
    const jointIdx = findSharedJoint(edgeA, edgeB);

    if (jointIdx === null) {
      setMeasuredAngle(null);
      // Edges don't share a joint — reset to the second edge only
      clearSelectedEdges();
      addSelectedEdge(edgeB);
      return;
    }

    const frame = frames[currentFrameIndex];
    const lms = frame?.landmarks;

    // Pre-compute plane angles from the current frame so both code paths can use them
    const computePlaneAngles = (jIdx: number) => {
      if (!lms) return undefined;
      const bodyFrame = buildBodyFrame(lms);
      if (!bodyFrame) return undefined;
      const [outerAIdx, outerBIdx] = getOuterEndpoints(edgeA, edgeB, jIdx);
      return getPlaneAngles(
        landmarkToVec3(lms[jIdx]),
        landmarkToVec3(lms[outerAIdx]),
        landmarkToVec3(lms[outerBIdx]),
        bodyFrame,
      );
    };

    calculateAngle({
      video_id: videoId,
      frame_index: currentFrameIndex,
      edge_a: edgeA,
      edge_b: edgeB,
    })
      .then((res) => {
        setMeasuredAngle({
          jointIndex: res.joint_index,
          degrees: res.angle_degrees,
          jointName: res.joint_name,
          planeAngles: computePlaneAngles(res.joint_index),
        });
      })
      .catch(() => {
        // Fallback: calculate locally from frame data
        if (frame && jointIdx !== null) {
          const [outerA, outerB] = getOuterEndpoints(edgeA, edgeB, jointIdx);
          const angle = calcAngleBetweenSegments(
            landmarkToVec3(lms![jointIdx]),
            landmarkToVec3(lms![outerA]),
            landmarkToVec3(lms![outerB]),
          );
          setMeasuredAngle({
            jointIndex: jointIdx,
            degrees: Math.round(angle * 10) / 10,
            jointName: JOINT_NAMES[jointIdx] || `Joint ${jointIdx}`,
            planeAngles: computePlaneAngles(jointIdx),
          });
        }
      });
  }, [selectedEdges, videoId, currentFrameIndex]);

  const handleEdgeClick = useCallback(
    (edge: [number, number]) => {
      addSelectedEdge(edge);
    },
    [addSelectedEdge],
  );

  return { handleEdgeClick, clearSelectedEdges };
}
