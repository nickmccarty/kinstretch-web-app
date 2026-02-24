import * as THREE from 'three';
import type { Landmark } from '../types/pose';

const SCALE = 2.0;

export function landmarkToVec3(lm: Landmark): THREE.Vector3 {
  return new THREE.Vector3(
    (lm.x - 0.5) * SCALE,
    -(lm.y - 0.5) * SCALE,
    -lm.z * SCALE,
  );
}

export function calcAngleBetweenSegments(
  joint: THREE.Vector3,
  outerA: THREE.Vector3,
  outerB: THREE.Vector3,
): number {
  const va = new THREE.Vector3().subVectors(outerA, joint);
  const vb = new THREE.Vector3().subVectors(outerB, joint);
  const cosAngle = va.dot(vb) / (va.length() * vb.length() + 1e-10);
  return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(cosAngle, -1, 1)));
}

export function createArcPoints(
  joint: THREE.Vector3,
  outerA: THREE.Vector3,
  outerB: THREE.Vector3,
  segments: number = 32,
): THREE.Vector3[] {
  const va = new THREE.Vector3().subVectors(outerA, joint).normalize();
  const vb = new THREE.Vector3().subVectors(outerB, joint).normalize();
  const radius = 0.08;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const v = new THREE.Vector3().lerpVectors(va, vb, t).normalize().multiplyScalar(radius);
    points.push(new THREE.Vector3().addVectors(joint, v));
  }

  return points;
}

export function findSharedJoint(
  edgeA: [number, number],
  edgeB: [number, number],
): number | null {
  const setA = new Set(edgeA);
  const shared: number[] = [];
  for (const idx of edgeB) {
    if (setA.has(idx)) shared.push(idx);
  }
  return shared.length === 1 ? shared[0] : null;
}

export function getOuterEndpoints(
  edgeA: [number, number],
  edgeB: [number, number],
  jointIdx: number,
): [number, number] {
  const outerA = edgeA[0] === jointIdx ? edgeA[1] : edgeA[0];
  const outerB = edgeB[0] === jointIdx ? edgeB[1] : edgeB[0];
  return [outerA, outerB];
}

/** Build a subject-relative anatomical coordinate frame from hip + shoulder landmarks. */
export function buildBodyFrame(landmarks: Landmark[]): {
  right: THREE.Vector3;   // ML axis — subject's anatomical right
  up: THREE.Vector3;      // SI axis — superior
  forward: THREE.Vector3; // AP axis — anterior
  origin: THREE.Vector3;  // hip centre in scene space
} | null {
  if ([11, 12, 23, 24].some((i) => !landmarks[i])) return null;

  const lHip = landmarkToVec3(landmarks[23]);
  const rHip = landmarkToVec3(landmarks[24]);
  const lSh  = landmarkToVec3(landmarks[11]);
  const rSh  = landmarkToVec3(landmarks[12]);

  const origin = lHip.clone().add(rHip).multiplyScalar(0.5);

  // ML axis: left-hip → right-hip
  const right = rHip.clone().sub(lHip).normalize();

  // SI axis: hip centre → shoulder centre, Gram-Schmidt orthogonalised vs right
  const shCentre = lSh.clone().add(rSh).multiplyScalar(0.5);
  const rawUp = shCentre.clone().sub(origin);
  const up = rawUp.sub(right.clone().multiplyScalar(rawUp.dot(right))).normalize();

  // AP axis: right × up
  const forward = new THREE.Vector3().crossVectors(right, up).normalize();

  return { right, up, forward, origin };
}

function projectOntoPlane(v: THREE.Vector3, n: THREE.Vector3): THREE.Vector3 {
  return v.clone().sub(n.clone().multiplyScalar(v.dot(n)));
}

function angleBetweenProjections(
  va: THREE.Vector3,
  vb: THREE.Vector3,
  normal: THREE.Vector3,
): number {
  const pa = projectOntoPlane(va, normal);
  const pb = projectOntoPlane(vb, normal);
  if (pa.length() < 1e-6 || pb.length() < 1e-6) return 0;
  const cos = THREE.MathUtils.clamp(pa.dot(pb) / (pa.length() * pb.length()), -1, 1);
  return THREE.MathUtils.radToDeg(Math.acos(cos));
}

export function getPlaneAngles(
  joint: THREE.Vector3,
  outerA: THREE.Vector3,
  outerB: THREE.Vector3,
  frame: NonNullable<ReturnType<typeof buildBodyFrame>>,
): { sagittal: number; frontal: number; transverse: number } {
  const va = outerA.clone().sub(joint);
  const vb = outerB.clone().sub(joint);
  return {
    sagittal:   angleBetweenProjections(va, vb, frame.right),    // plane normal = ML axis
    frontal:    angleBetweenProjections(va, vb, frame.forward),  // plane normal = AP axis
    transverse: angleBetweenProjections(va, vb, frame.up),       // plane normal = SI axis
  };
}

export function buildCylinderTransform(
  start: THREE.Vector3,
  end: THREE.Vector3,
): { position: THREE.Vector3; quaternion: THREE.Quaternion; length: number } {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction,
  );
  return { position: mid, quaternion, length };
}
