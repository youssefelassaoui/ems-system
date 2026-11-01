"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clamp } from "@/lib/simulation";
import { ENERGY } from "@/lib/palette";
import { COLORS, NODE, REF, type SmoothRef } from "./types";

const COLS = 4;
const ROWS = 3;
const SPACING_X = 1.4;
const SPACING_Z = 1.55;
const PANEL_W = 1.25;
const PANEL_D = 1.05;
const PANEL_T = 0.05;
const TILT = 0.5;
const BASE_Y = 0.26;

function usePanelTexture() {
  return useMemo(() => {
    const w = 320;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Frame
    ctx.fillStyle = "#eceff4";
    ctx.fillRect(0, 0, w, h);

    // Cells
    const m = 10;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#1a3fae");
    g.addColorStop(0.55, "#2a5be0");
    g.addColorStop(1, "#16379e");
    ctx.fillStyle = g;
    ctx.fillRect(m, m, w - m * 2, h - m * 2);

    const cols = 6;
    const rows = 8;
    const cw = (w - m * 2) / cols;
    const ch = (h - m * 2) / rows;
    ctx.strokeStyle = "rgba(190,214,255,0.55)";
    ctx.lineWidth = 1.6;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(m + c * cw, m);
      ctx.lineTo(m + c * cw, h - m);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(m, m + r * ch);
      ctx.lineTo(w - m, m + r * ch);
      ctx.stroke();
    }
    // Busbars
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    for (let c = 0; c < cols; c++) {
      for (const k of [0.33, 0.66]) {
        ctx.beginPath();
        ctx.moveTo(m + (c + k) * cw, m);
        ctx.lineTo(m + (c + k) * cw, h - m);
        ctx.stroke();
      }
    }
    // Soft diagonal sheen
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0.2, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.14)");
    sheen.addColorStop(0.8, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(m, m, w - m * 2, h - m * 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

export function PvField({ smooth }: { smooth: SmoothRef }) {
  const texture = usePanelTexture();
  const panels = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  const glassMat = useRef<THREE.MeshStandardMaterial>(null);

  const materials = useMemo(() => {
    const frame = new THREE.MeshStandardMaterial({ color: COLORS.frame, roughness: 0.4, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({
      map: texture,
      color: "#ffffff",
      roughness: 0.18,
      metalness: 0.45,
      emissive: new THREE.Color("#ffb347"),
      emissiveIntensity: 0.1,
      envMapIntensity: 1.4,
    });
    return { frame, glass, list: [frame, frame, glass, frame, frame, frame] };
  }, [texture]);

  useEffect(() => {
    glassMat.current = materials.glass;
  }, [materials]);

  useEffect(() => {
    const p = panels.current;
    const s = posts.current;
    if (!p || !s) return;
    const d = new THREE.Object3D();
    let i = 0;
    let j = 0;
    const sin = Math.sin(TILT);
    const cos = Math.cos(TILT);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c - (COLS - 1) / 2) * SPACING_X;
        const z = (r - (ROWS - 1) / 2) * SPACING_Z;
        const centerY = BASE_Y + (PANEL_D * sin) / 2;

        d.position.set(x, centerY, z);
        d.rotation.set(TILT, 0, 0);
        d.scale.set(1, 1, 1);
        d.updateMatrix();
        p.setMatrixAt(i++, d.matrix);

        // Rear (tall) and front (short) supports
        const rearZ = z - (PANEL_D * cos) / 2 + 0.06;
        const frontZ = z + (PANEL_D * cos) / 2 - 0.06;
        const rearH = BASE_Y + PANEL_D * sin - 0.04;
        const frontH = BASE_Y;
        for (const dx of [-0.42, 0.42]) {
          d.rotation.set(0, 0, 0);
          d.position.set(x + dx, rearH / 2, rearZ);
          d.scale.set(1, rearH, 1);
          d.updateMatrix();
          s.setMatrixAt(j++, d.matrix);
          d.position.set(x + dx, frontH / 2, frontZ);
          d.scale.set(1, frontH, 1);
          d.updateMatrix();
          s.setMatrixAt(j++, d.matrix);
        }
      }
    }
    p.instanceMatrix.needsUpdate = true;
    s.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const g = glassMat.current;
    if (!g) return;
    const k = clamp(smooth.current.pv / REF.pv, 0, 1);
    g.emissiveIntensity = 0.03 + 0.24 * k;
  });

  const [px, , pz] = NODE.pv;

  return (
    <group position={[px, 0, pz]}>
      <instancedMesh
        ref={panels}
        args={[undefined, undefined, COLS * ROWS]}
        material={materials.list}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <boxGeometry args={[PANEL_W, PANEL_T, PANEL_D]} />
      </instancedMesh>

      <instancedMesh
        ref={posts}
        args={[undefined, undefined, COLS * ROWS * 4]}
        castShadow
        frustumCulled={false}
      >
        <boxGeometry args={[0.05, 1, 0.05]} />
        <meshStandardMaterial color="#c5cbd6" roughness={0.5} metalness={0.4} />
      </instancedMesh>

      {/* Combiner / inverter cabinet */}
      <mesh position={[3.35, 0.3, 0.8]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.6, 0.5]} />
        <meshStandardMaterial color="#f1f3f7" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[3.35, 0.38, 1.06]}>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshBasicMaterial color={ENERGY.solar.main} toneMapped={false} />
      </mesh>
    </group>
  );
}
