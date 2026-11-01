"use client";

import { useMemo } from "react";
import { Line, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { NODE } from "./types";

type P3 = [number, number, number];

const [GX, , GZ] = NODE.grid;
const PYLON_POS: P3 = [GX + 2.35, 0, GZ + 1.25];

const curvePoints = (curve: THREE.Curve<THREE.Vector3>, n = 40) =>
  curve.getPoints(n).map((v) => [v.x, v.y, v.z] as P3);

/** Lattice transmission tower rendered as crisp violet line work. */
function Pylon() {
  const { frame, arms, wires } = useMemo(() => {
    const heights = [0, 1.3, 2.4, 3.3, 4.0, 4.7];
    const half = [0.72, 0.52, 0.38, 0.28, 0.21, 0.16];
    const frame: P3[] = [];

    const corners = (i: number): P3[] => [
      [-half[i], heights[i], -half[i]],
      [half[i], heights[i], -half[i]],
      [half[i], heights[i], half[i]],
      [-half[i], heights[i], half[i]],
    ];

    for (let i = 0; i < heights.length; i++) {
      const c = corners(i);
      for (let k = 0; k < 4; k++) frame.push(c[k], c[(k + 1) % 4]);
      if (i === heights.length - 1) continue;
      const n = corners(i + 1);
      for (let k = 0; k < 4; k++) {
        frame.push(c[k], n[k]);
        const k2 = (k + 1) % 4;
        frame.push(c[k], n[k2], c[k2], n[k]);
      }
    }

    const arms: P3[] = [
      [0, 3.3, -1.25],
      [0, 3.3, 1.25],
      [0, 4.0, -1.0],
      [0, 4.0, 1.0],
      [0, 4.7, 0],
      [0, 5.05, 0],
    ];

    const tips: P3[] = [
      [0, 3.3, -1.25],
      [0, 3.3, 1.25],
      [0, 4.0, -1.0],
      [0, 4.0, 1.0],
    ];

    const wires = tips.map((t) => {
      const end: P3 = [9, t[1] - 1.3, t[2] * 1.9];
      const mid: P3 = [(t[0] + end[0]) / 2, Math.min(t[1], end[1]) - 0.5, (t[2] + end[2]) / 2];
      return curvePoints(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(...t),
          new THREE.Vector3(...mid),
          new THREE.Vector3(...end),
        ),
      );
    });

    return { frame, arms, wires };
  }, []);

  return (
    <group position={PYLON_POS}>
      <Line points={frame} segments color="#5b31c8" lineWidth={1.4} />
      <Line points={arms} segments color="#5b31c8" lineWidth={2.2} />
      {wires.map((w, i) => (
        <Line key={i} points={w} color="#9d86e8" lineWidth={1.1} />
      ))}
      {([
        [0, 3.18, -1.25],
        [0, 3.18, 1.25],
        [0, 3.88, -1.0],
        [0, 3.88, 1.0],
      ] as P3[]).map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.035, 0.05, 0.22, 10]} />
          <meshStandardMaterial color="#e8e2ff" roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {([
        [-0.72, -0.72],
        [0.72, -0.72],
        [0.72, 0.72],
        [-0.72, 0.72],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]} receiveShadow>
          <boxGeometry args={[0.22, 0.08, 0.22]} />
          <meshStandardMaterial color="#e3dcfb" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function GridStation() {
  const jumper = useMemo(
    () =>
      curvePoints(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(GX + 0.4, 1.4, GZ),
          new THREE.Vector3(GX + 1.8, 2.9, GZ),
          new THREE.Vector3(PYLON_POS[0], 3.3, GZ),
        ),
        30,
      ),
    [],
  );

  const fence = useMemo<P3[]>(
    () => [
      [GX - 1.25, 0.03, GZ - 1.0],
      [GX + 1.35, 0.03, GZ - 1.0],
      [GX + 1.35, 0.03, GZ + 1.0],
      [GX - 1.25, 0.03, GZ + 1.0],
      [GX - 1.25, 0.03, GZ - 1.0],
    ],
    [],
  );

  return (
    <group>
      <Line points={fence} color="#b4a2f0" lineWidth={1.2} dashed dashSize={0.18} gapSize={0.1} />

      {/* Transformer */}
      <group position={[GX, 0, GZ]}>
        <RoundedBox args={[1.5, 0.95, 1.05]} radius={0.06} smoothness={4} position={[0, 0.58, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f1edff" roughness={0.4} metalness={0.25} />
        </RoundedBox>
        {[-0.45, -0.15, 0.15, 0.45].map((z) => (
          <mesh key={z} position={[0.8, 0.55, z]} castShadow>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color="#ddd5fa" roughness={0.45} metalness={0.3} />
          </mesh>
        ))}
        {[-0.4, 0, 0.4].map((x) => (
          <group key={x} position={[x, 1.05, 0]}>
            <mesh position={[0, 0.16, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.09, 0.32, 14]} />
              <meshStandardMaterial color="#e2dafc" roughness={0.3} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.34, 0]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color="#5b31c8" roughness={0.3} metalness={0.6} />
            </mesh>
          </group>
        ))}
        <mesh position={[-0.2, 0.62, 0.535]}>
          <boxGeometry args={[0.5, 0.22, 0.01]} />
          <meshBasicMaterial color="#5b31c8" />
        </mesh>
        <mesh position={[-0.2, 0.62, 0.542]}>
          <boxGeometry args={[0.34, 0.03, 0.004]} />
          <meshBasicMaterial color="#cdbdff" toneMapped={false} />
        </mesh>
      </group>

      {/* Transformer → tower jumper */}
      <Line points={jumper} color="#9d86e8" lineWidth={1.2} />

      <Pylon />
    </group>
  );
}
