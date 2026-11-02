"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clamp } from "@/lib/simulation";
import type { SmoothRef } from "./types";

const TICKS = 36;

/** The energy hub: where every flow is orchestrated. */
export function Hub({ smooth }: { smooth: SmoothRef }) {
  const spin = useRef<THREE.Group>(null);
  const octa = useRef<THREE.Mesh>(null);
  const pulseA = useRef<THREE.Mesh>(null);
  const pulseB = useRef<THREE.Mesh>(null);
  const coreMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const octaMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const s = smooth.current;
    const activity = clamp((s.pv + s.load) / 2400, 0, 1);

    if (spin.current) spin.current.rotation.y += dt * (0.35 + activity * 1.1);
    if (octa.current) {
      octa.current.rotation.y += dt * 0.9;
      octa.current.position.y = 2.38 + Math.sin(t * 1.6) * 0.07;
    }

    const rate = 0.28 + activity * 0.3;
    [pulseA.current, pulseB.current].forEach((m, k) => {
      if (!m) return;
      const phase = (t * rate + k * 0.5) % 1;
      m.scale.setScalar(1 + phase * 2.2);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - phase, 1.6) * 0.38;
    });

    if (coreMat.current) coreMat.current.emissiveIntensity = 0.35 + 0.25 * activity + 0.07 * Math.sin(t * 2.2);
    if (octaMat.current) octaMat.current.emissiveIntensity = 0.7 + 0.4 * Math.sin(t * 2.6);
  });

  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.3, 0.28, 64]} />
        <meshStandardMaterial color="#f6f9ff" roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.29, 0]}>
        <torusGeometry args={[1.12, 0.03, 12, 96]} />
        <meshBasicMaterial color="#5f94ff" toneMapped={false} />
      </mesh>

      {/* Core column */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.62, 1.4, 48]} />
        <meshPhysicalMaterial
          ref={coreMat}
          color="#2f6bff"
          emissive="#2f6bff"
          emissiveIntensity={0.4}
          roughness={0.18}
          metalness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.6, 0.55, 0.06, 48]} />
        <meshStandardMaterial color="#f6f9ff" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Light bands */}
      {[0.6, 0.95, 1.3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.625 - (y - 0.6) * 0.05, 0.625 - (y - 0.6) * 0.05, 0.025, 48]} />
          <meshBasicMaterial color="#dbe8ff" toneMapped={false} />
        </mesh>
      ))}

      {/* Floating intelligence crystal */}
      <mesh ref={octa} position={[0, 2.38, 0]} castShadow>
        <octahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial
          ref={octaMat}
          color="#ffffff"
          emissive="#7fb0ff"
          emissiveIntensity={0.8}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>

      {/* Rotating tick ring */}
      <group ref={spin} position={[0, 0.07, 0]}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2;
          const major = i % 3 === 0;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55]} rotation-y={-a}>
              <boxGeometry args={[0.05, 0.03, major ? 0.2 : 0.1]} />
              <meshBasicMaterial color={major ? "#2f6bff" : "#9fbdf7"} toneMapped={false} />
            </mesh>
          );
        })}
      </group>

      {/* Expanding pulse rings */}
      <mesh ref={pulseA} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.55, 1.6, 96]} />
        <meshBasicMaterial color="#2f6bff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={pulseB} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.55, 1.6, 96]} />
        <meshBasicMaterial color="#2f6bff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
