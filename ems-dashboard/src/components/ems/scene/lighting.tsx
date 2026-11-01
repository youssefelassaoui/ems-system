"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { SUNRISE_MIN, SUNSET_MIN, clamp, smoothstep, sunFraction } from "@/lib/simulation";
import type { SmoothRef } from "./types";

/**
 * Sun position and light intensity follow the simulated time of day,
 * so shadows slowly sweep across the platform.
 */
export function SceneLights({ smooth }: { smooth: SmoothRef }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const minute = smooth.current.minute;
    const frac = clamp((minute - SUNRISE_MIN) / (SUNSET_MIN - SUNRISE_MIN), 0, 1);
    const angle = Math.PI * frac;
    const day = smoothstep(0, 0.12, sunFraction(minute));

    if (sun.current) {
      sun.current.position.set(Math.cos(angle) * 15, 6 + Math.sin(angle) * 9, 8.5);
      sun.current.intensity = 0.55 + 2.1 * day;
    }
    if (hemi.current) hemi.current.intensity = 0.7 + 0.5 * day;
    if (fill.current) fill.current.intensity = 0.25 + 0.2 * day;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#ffffff", "#cdd6e6", 1]} />
      <directionalLight
        ref={sun}
        position={[0, 14, 8]}
        color="#fff3de"
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
      />
      <directionalLight ref={fill} position={[-9, 6, -8]} color="#b9c8e2" intensity={0.4} />
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        <group>
          <Lightformer form="rect" intensity={2.6} position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.5} position={[-11, 4, 5]} rotation-y={Math.PI / 2} scale={[12, 6, 1]} color="#e4ebf6" />
          <Lightformer form="rect" intensity={1.2} position={[11, 4, -5]} rotation-y={-Math.PI / 2} scale={[12, 6, 1]} color="#c4d2ea" />
          <Lightformer form="rect" intensity={0.9} position={[0, 3, 12]} scale={[16, 5, 1]} color="#ffffff" />
        </group>
      </Environment>
    </>
  );
}
