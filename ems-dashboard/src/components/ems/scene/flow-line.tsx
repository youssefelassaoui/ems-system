"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { roundedPath, sampleLut, type Vec3 } from "./paths";
import { COLORS, type SceneSmooth, type SmoothRef } from "./types";

const COUNT = 38;
const LUT_SAMPLES = 260;

export interface FlowState {
  /** 0 → 1 */
  level: number;
  /** +1 = from the path start to its end, −1 = reverse. */
  dir: 1 | -1;
}

interface FlowLineProps {
  points: readonly Vec3[];
  color: string;
  smooth: SmoothRef;
  getFlow: (s: SceneSmooth) => FlowState;
  radius?: number;
}

/**
 * A cable on the platform with luminous particles travelling along it.
 * Density, speed and direction follow the live energy flow.
 */
export function FlowLine({ points, color, smooth, getFlow, radius = 0.07 }: FlowLineProps) {
  const curve = useMemo(() => roundedPath(points, 0.6), [points]);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 180, radius, 14, false), [curve, radius]);
  const glowTube = useMemo(() => new THREE.TubeGeometry(curve, 180, radius * 2.1, 14, false), [curve, radius]);
  const lut = useMemo(() => sampleLut(curve, LUT_SAMPLES), [curve]);
  const rank = useMemo(() => Array.from({ length: COUNT }, (_, i) => (i * 0.6180339887) % 1), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const core = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const offset = useRef(0);
  const level = useRef(0);

  useFrame((_, dt) => {
    const flow = getFlow(smooth.current);
    level.current += (flow.level - level.current) * (1 - Math.exp(-dt * 4));
    const l = level.current;

    const speed = 0.045 + 0.22 * Math.sqrt(l);
    offset.current = (((offset.current + flow.dir * speed * dt) % 1) + 1) % 1;

    const c = core.current;
    const h = halo.current;
    if (!c || !h) return;

    for (let i = 0; i < COUNT; i++) {
      const u = (offset.current + i / COUNT) % 1;
      const visible = Math.min(1, Math.max(0, (l - rank[i]) / 0.12));
      const edge = Math.pow(Math.sin(Math.PI * u), 0.55);
      const s = visible * edge;

      const f = u * (LUT_SAMPLES - 1);
      const idx = Math.min(LUT_SAMPLES - 2, Math.floor(f));
      const t = f - idx;
      const a = idx * 3;
      const x = lut[a] + (lut[a + 3] - lut[a]) * t;
      const y = lut[a + 1] + (lut[a + 4] - lut[a + 1]) * t;
      const z = lut[a + 2] + (lut[a + 5] - lut[a + 2]) * t;

      dummy.position.set(x, y + 0.02, z);
      dummy.scale.setScalar(Math.max(0.0001, s));
      dummy.updateMatrix();
      c.setMatrixAt(i, dummy.matrix);

      dummy.scale.setScalar(Math.max(0.0001, s * 2.6));
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
    }
    c.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;

    if (glowMat.current) glowMat.current.opacity = 0.05 + 0.4 * l;
  });

  return (
    <group>
      <mesh geometry={tube} receiveShadow>
        <meshStandardMaterial color={COLORS.cable} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh geometry={glowTube}>
        <meshBasicMaterial
          ref={glowMat}
          color={color}
          transparent
          opacity={0.05}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <instancedMesh ref={halo} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <sphereGeometry args={[radius * 1.25, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={core} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <sphereGeometry args={[radius * 1.2, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
