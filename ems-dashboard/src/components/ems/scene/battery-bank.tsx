"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { BATTERY_UNIT_SOC_OFFSETS as SOC_OFFSETS } from "@/lib/assets";
import { COLORS, NODE, type SmoothRef } from "./types";

const UNITS = 3;
const SEGMENTS = 10;
const UNIT_X = 1.4;

const LIT = new THREE.Color("#2fd08f");
const LIT_HOT = new THREE.Color("#b8f7dc");
const OFF = new THREE.Color("#294a3f");

function Fan({ position, speed }: { position: [number, number, number]; speed: React.RefObject<number> }) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y += dt * speed.current;
  });
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.2, 0.022, 10, 36]} />
        <meshStandardMaterial color="#c6d3cd" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.01, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.012, 32]} />
        <meshStandardMaterial color="#2a4a40" roughness={0.6} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation-y={(i / 5) * Math.PI * 2} position={[0, 0.012, 0]}>
            <boxGeometry args={[0.34, 0.01, 0.07]} />
            <meshStandardMaterial color="#eef6f2" roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function BatteryBank({ smooth }: { smooth: SmoothRef }) {
  const leds = useRef<THREE.InstancedMesh>(null);
  const status = useRef<THREE.MeshBasicMaterial>(null);
  const fanSpeed = useRef(1);
  const color = useMemo(() => new THREE.Color(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = leds.current;
    if (!m) return;
    for (let u = 0; u < UNITS; u++) {
      for (let s = 0; s < SEGMENTS; s++) {
        const i = u * SEGMENTS + s;
        dummy.position.set((u - 1) * UNIT_X, 0.28 + s * 0.083, 1.262);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        m.setColorAt(i, OFF);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy]);

  useFrame(({ clock }) => {
    const m = leds.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const { soc, battery } = smooth.current;
    const active = Math.min(1, Math.abs(battery) / 600);
    fanSpeed.current = 1.5 + active * 14;

    for (let u = 0; u < UNITS; u++) {
      const level = Math.min(1, Math.max(0, soc + SOC_OFFSETS[u])) * SEGMENTS;
      for (let s = 0; s < SEGMENTS; s++) {
        const fill = Math.min(1, Math.max(0, level - s));
        color.copy(OFF).lerp(LIT, fill);
        // The leading segment breathes while the pack is working.
        if (fill > 0 && fill < 1 + 1e-6 && s === Math.floor(level) && active > 0.04) {
          color.lerp(LIT_HOT, (0.5 + 0.5 * Math.sin(t * 5)) * active);
        }
        m.setColorAt(u * SEGMENTS + s, color);
      }
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;

    if (status.current) {
      status.current.opacity = 0.65 + 0.35 * Math.sin(t * (2 + active * 6));
    }
  });

  const [bx, , bz] = NODE.battery;

  return (
    <group position={[bx, 0, bz]}>
      {/* Common plinth */}
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[UNIT_X * UNITS + 0.35, 0.1, 2.95]} />
        <meshStandardMaterial color="#e4ebe8" roughness={0.7} />
      </mesh>

      {Array.from({ length: UNITS }, (_, u) => {
        const x = (u - 1) * UNIT_X;
        return (
          <group key={u} position={[x, 0, 0]}>
            <RoundedBox args={[1.12, 1.3, 2.5]} radius={0.07} smoothness={4} position={[0, 0.75, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={COLORS.white} roughness={0.42} metalness={0.12} />
            </RoundedBox>
            {/* Roof accent */}
            <mesh position={[0, 1.405, 0]} castShadow>
              <boxGeometry args={[1.0, 0.04, 2.38]} />
              <meshStandardMaterial color="#cfeadd" roughness={0.5} metalness={0.2} />
            </mesh>
            {/* Door seams */}
            {[-0.45, 0.45].map((z) => (
              <mesh key={z} position={[0.565, 0.75, z]}>
                <boxGeometry args={[0.006, 1.1, 0.012]} />
                <meshBasicMaterial color="#c3d3cb" />
              </mesh>
            ))}
            {/* Front display bezel */}
            <mesh position={[0, 0.74, 1.253]}>
              <boxGeometry args={[0.46, 0.98, 0.02]} />
              <meshStandardMaterial color="#0f2a24" roughness={0.35} metalness={0.4} />
            </mesh>
            {/* Green identity band above the display */}
            <mesh position={[0, 1.27, 1.256]}>
              <boxGeometry args={[0.96, 0.07, 0.01]} />
              <meshBasicMaterial color={COLORS.battery} toneMapped={false} />
            </mesh>
            {/* Status light */}
            <mesh position={[0.36, 1.17, 1.262]}>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial ref={u === 1 ? status : undefined} color="#3df0a5" transparent toneMapped={false} />
            </mesh>
            {/* Cooling fans */}
            <Fan position={[0, 1.44, -0.55]} speed={fanSpeed} />
            <Fan position={[0, 1.44, 0.4]} speed={fanSpeed} />
          </group>
        );
      })}

      {/* LED SOC bars (instanced) */}
      <instancedMesh ref={leds} args={[undefined, undefined, UNITS * SEGMENTS]} frustumCulled={false}>
        <boxGeometry args={[0.26, 0.058, 0.012]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Busbar & stubs */}
      <mesh position={[0, 0.1, 1.8]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.05, 0.05, UNIT_X * 2, 12]} />
        <meshStandardMaterial color={COLORS.cable} roughness={0.45} />
      </mesh>
      {[-1, 0, 1].map((k) => (
        <mesh key={k} position={[k * UNIT_X, 0.1, 1.5]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 12]} />
          <meshStandardMaterial color={COLORS.cable} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}
