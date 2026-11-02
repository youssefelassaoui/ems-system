"use client";

import type { ReactNode } from "react";
import type * as THREE from "three";
import { junctionBoxes } from "@/lib/module-layout";
import type { CellLayout } from "./textures";

/** Flat, unlit colours for every part of the module, as a thermal camera sees it. */
export interface ModuleTint {
  frame: string;
  rear: string;
  junctionBox: string;
  rail: string;
}

/** Landscape module, metres. */
export const MODULE_W = 2.28;
export const MODULE_H = 1.13;
export const MODULE_T = 0.035;
/** Height of the front glass above the laminate centre; layers drawn on the glass sit just above it. */
export const GLASS_Z = MODULE_T * 0.21;

const W = MODULE_W;
const H = MODULE_H;
const T = MODULE_T;

function Frame({ layout, tint }: { layout: CellLayout; tint?: ModuleTint }) {
  if (!layout.framed) {
    // Frameless glass–glass laminate: thin clear edge only.
    return (
      <mesh>
        <boxGeometry args={[W + 0.01, H + 0.01, T * 0.45]} />
        {tint ? (
          <meshBasicMaterial color={tint.frame} toneMapped={false} />
        ) : (
          <meshPhysicalMaterial color="#9fb3b8" roughness={0.15} transmission={0.4} transparent opacity={0.55} />
        )}
      </mesh>
    );
  }
  const f = 0.032;
  const d = T * 1.25;
  const mat = tint ? (
    <meshBasicMaterial color={tint.frame} toneMapped={false} />
  ) : (
    <meshStandardMaterial color="#c9d0d9" metalness={0.85} roughness={0.32} />
  );
  return (
    <group>
      {[1, -1].map((s) => (
        <mesh key={`h${s}`} position={[0, s * (H / 2 + f / 2), 0]} castShadow>
          <boxGeometry args={[W + 2 * f, f, d]} />
          {mat}
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={`v${s}`} position={[s * (W / 2 + f / 2), 0, 0]} castShadow>
          <boxGeometry args={[f, H, d]} />
          {mat}
        </mesh>
      ))}
    </group>
  );
}

/**
 * A PV module in its own frame of reference (front glass facing +z, long edge along x):
 * laminate, cells under glass, rear side, junction boxes, frame and mounting rails.
 * `children` are extra layers drawn on the glass (dust, thermal image…), placed at `GLASS_Z`.
 * With `tint`, everything but the front face is drawn in flat thermal colours.
 */
export function ModuleBody({
  layout,
  bifacial,
  cells,
  tint,
  children,
}: {
  layout: CellLayout;
  bifacial: boolean;
  cells: THREE.Texture;
  tint?: ModuleTint;
  children?: ReactNode;
}) {
  return (
    <group>
      {/* Laminate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, T * 0.4]} />
        {tint ? (
          <meshBasicMaterial color={tint.rear} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={layout.backsheet} roughness={0.6} />
        )}
      </mesh>
      {/* Cells under glass */}
      <mesh position={[0, 0, GLASS_Z]}>
        <planeGeometry args={[W, H]} />
        <meshPhysicalMaterial
          map={cells}
          roughness={0.28}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={0.55}
        />
      </mesh>
      {children}
      {/* Rear: white backsheet, or cells seen through the rear glass of bifacial modules */}
      <mesh position={[0, 0, -GLASS_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[W, H]} />
        {tint ? (
          <meshBasicMaterial color={tint.rear} toneMapped={false} />
        ) : bifacial ? (
          <meshStandardMaterial map={cells} color="#9aa3b0" roughness={0.3} />
        ) : (
          <meshStandardMaterial color="#e9ecf0" roughness={0.75} />
        )}
      </mesh>
      {/* Junction box(es) */}
      {junctionBoxes(layout).map((j) => (
        <mesh key={j.x} position={[(j.x - 0.5) * W, (0.5 - j.y) * H, -GLASS_Z - 0.018]} castShadow>
          <boxGeometry args={[0.1, 0.07, 0.03]} />
          {tint ? (
            <meshBasicMaterial color={tint.junctionBox} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#1d2330" roughness={0.5} />
          )}
        </mesh>
      ))}
      <Frame layout={layout} tint={tint} />
      {/* Mounting rails */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0, -T - 0.025]} castShadow>
          <boxGeometry args={[0.045, H * 1.08, 0.04]} />
          {tint ? (
            <meshBasicMaterial color={tint.rail} toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#aeb6c2" metalness={0.7} roughness={0.4} />
          )}
        </mesh>
      ))}
    </group>
  );
}
