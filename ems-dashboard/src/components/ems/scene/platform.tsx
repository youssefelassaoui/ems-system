"use client";

import { useMemo } from "react";
import * as THREE from "three";

function useDotTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "rgba(98,117,156,0.3)";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

/** The floating circular base of the digital twin. */
export function Platform() {
  const dots = useDotTexture();

  return (
    <group>
      {/* Lower pedestal */}
      <mesh position={[0, -0.62, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[10.4, 10.0, 0.34, 120]} />
        <meshStandardMaterial color="#e5e9f0" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Main plate */}
      <mesh position={[0, -0.2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[9.6, 9.8, 0.4, 120]} />
        <meshStandardMaterial color="#fbfcfd" roughness={0.85} metalness={0} />
      </mesh>
      {/* Dot grid */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <circleGeometry args={[9.5, 96]} />
        <meshBasicMaterial map={dots} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Concentric guides */}
      {[3.4, 6.2, 8.8].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
          <ringGeometry args={[r, r + 0.025, 128]} />
          <meshBasicMaterial color="#cdd6e4" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {/* Luminous edge */}
      <mesh rotation-x={Math.PI / 2} position={[0, 0.0, 0]}>
        <torusGeometry args={[9.62, 0.035, 12, 160]} />
        <meshBasicMaterial color="#7ba7ff" toneMapped={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, -0.4, 0]}>
        <torusGeometry args={[9.8, 0.02, 10, 160]} />
        <meshBasicMaterial color="#cdd6e4" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Invisible plane that only receives the cast shadows beneath the platform. */
export function ShadowCatcher() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.82, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <shadowMaterial opacity={0.14} color="#1d2a4d" />
    </mesh>
  );
}
