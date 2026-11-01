"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, NODE, REF, type SmoothRef } from "./types";

const OFF = new THREE.Color("#d2dcee");
const ON = new THREE.Color("#ffd98a");

interface Win {
  x: number;
  y: number;
  z: number;
  ry: number;
}

/** Window layout for the main building (local coordinates). */
function buildWindows(): Win[] {
  const out: Win[] = [];
  // Front (+z) face
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      out.push({ x: (c - 2.5) * 0.4, y: -0.4 + r * 0.5, z: 1.003, ry: 0 });
    }
  }
  // Side (+x) face
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      out.push({ x: 1.353, y: -0.4 + r * 0.5, z: (c - 1.5) * 0.46, ry: Math.PI / 2 });
    }
  }
  return out;
}

export function Campus({ smooth }: { smooth: SmoothRef }) {
  const windows = useMemo(() => buildWindows(), []);
  const rank = useMemo(
    () => windows.map((_, i) => (i * 0.6180339887 + 0.13) % 1),
    [windows],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    windows.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z);
      dummy.rotation.set(0, w.ry, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, OFF);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [windows, dummy]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const level = Math.min(1, smooth.current.load / (REF.load * 0.95));
    windows.forEach((_, i) => {
      const on = Math.min(1, Math.max(0, (level - rank[i] * 0.85) / 0.12));
      color.copy(OFF).lerp(ON, on);
      m.setColorAt(i, color);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  const [cx, , cz] = NODE.campus;

  return (
    <group position={[cx, 0, cz]}>
      {/* Main building */}
      <group position={[0, 0.9, 0]}>
        <RoundedBox args={[2.7, 1.8, 2.0]} radius={0.07} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={COLORS.white} roughness={0.5} metalness={0.05} />
        </RoundedBox>
        {/* Roof slab */}
        <mesh position={[0, 0.93, 0]} castShadow>
          <boxGeometry args={[2.82, 0.07, 2.12]} />
          <meshStandardMaterial color="#dfe9ff" roughness={0.5} />
        </mesh>
        {/* Rooftop units */}
        <mesh position={[-0.6, 1.1, -0.2]} castShadow>
          <boxGeometry args={[0.7, 0.26, 0.5]} />
          <meshStandardMaterial color="#eaf1ff" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.5, 1.06, 0.3]} castShadow>
          <boxGeometry args={[0.45, 0.18, 0.45]} />
          <meshStandardMaterial color="#eaf1ff" roughness={0.5} metalness={0.2} />
        </mesh>
        {/* Blue accent band */}
        <mesh position={[0, -0.78, 1.003]}>
          <boxGeometry args={[2.7, 0.14, 0.01]} />
          <meshStandardMaterial color="#2f6bff" roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[1.353, -0.78, 0]}>
          <boxGeometry args={[0.01, 0.14, 2.0]} />
          <meshStandardMaterial color="#2f6bff" roughness={0.4} metalness={0.2} />
        </mesh>
        {/* Windows */}
        <instancedMesh ref={mesh} args={[undefined, undefined, windows.length]} frustumCulled={false}>
          <planeGeometry args={[0.3, 0.36]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      </group>

      {/* Annex */}
      <group position={[-2.15, 0.55, -1.7]}>
        <RoundedBox args={[1.4, 1.1, 1.4]} radius={0.06} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={COLORS.white} roughness={0.5} metalness={0.05} />
        </RoundedBox>
        <mesh position={[0, 0.58, 0]} castShadow>
          <boxGeometry args={[1.5, 0.06, 1.5]} />
          <meshStandardMaterial color="#dfe9ff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.1, 0.703]}>
          <boxGeometry args={[0.5, 0.6, 0.01]} />
          <meshStandardMaterial color="#9fbdf7" roughness={0.3} metalness={0.4} />
        </mesh>
      </group>

      {/* EV charging posts */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[1.0 + i * 0.5, 0, 1.95]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.16, 0.6, 0.12]} />
            <meshStandardMaterial color="#f1f6ff" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.46, 0.065]}>
            <boxGeometry args={[0.08, 0.1, 0.01]} />
            <meshBasicMaterial color="#5f9bff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
