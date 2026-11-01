import * as THREE from "three";

export type Vec3 = readonly [number, number, number];

/**
 * Builds a polyline with softly rounded corners — the circuit-board look used
 * for the power cables on the platform.
 */
export function roundedPath(points: readonly Vec3[], radius: number) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  let cursor = pts[0].clone();

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const dIn = cur.clone().sub(prev);
    const dOut = next.clone().sub(cur);
    const r = Math.min(radius, dIn.length() / 2, dOut.length() / 2);
    const a = cur.clone().sub(dIn.normalize().multiplyScalar(r));
    const b = cur.clone().add(dOut.normalize().multiplyScalar(r));
    path.add(new THREE.LineCurve3(cursor.clone(), a));
    path.add(new THREE.QuadraticBezierCurve3(a, cur.clone(), b));
    cursor = b;
  }
  path.add(new THREE.LineCurve3(cursor, pts[pts.length - 1].clone()));
  return path;
}

/** Pre-samples a curve by arc length so particles can be placed cheaply. */
export function sampleLut(curve: THREE.Curve<THREE.Vector3>, samples: number) {
  const lut = new Float32Array(samples * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < samples; i++) {
    curve.getPointAt(i / (samples - 1), v);
    lut[i * 3] = v.x;
    lut[i * 3 + 1] = v.y;
    lut[i * 3 + 2] = v.z;
  }
  return lut;
}
