"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { AssetId } from "@/lib/assets";
import { COLORS, NODE } from "./types";

type P3 = [number, number, number];

interface Box {
  position: P3;
  size: P3;
}

interface Zone {
  id: AssetId;
  /** Invisible volumes that capture the pointer. */
  boxes: Box[];
  /** Ground outline drawn while the asset is hovered. */
  footprint: { x: number; z: number; w: number; d: number; r: number };
  color: string;
}

const [PX, , PZ] = NODE.pv;
const [BX, , BZ] = NODE.battery;
const [GX, , GZ] = NODE.grid;

/* Dimensions mirror the geometry in pv-field / battery-bank / grid-station. */
const ZONES: readonly Zone[] = [
  {
    id: "pv",
    color: COLORS.pv,
    boxes: [{ position: [PX + 0.45, 0.85, PZ], size: [6.5, 1.7, 4.5] }],
    footprint: { x: PX + 0.45, z: PZ, w: 6.9, d: 4.9, r: 0.45 },
  },
  {
    id: "battery",
    color: COLORS.battery,
    boxes: [{ position: [BX, 0.9, BZ], size: [4.7, 1.8, 3.1] }],
    footprint: { x: BX, z: BZ, w: 5.1, d: 3.5, r: 0.45 },
  },
  {
    id: "grid",
    color: COLORS.grid,
    boxes: [
      { position: [GX + 0.05, 0.95, GZ], size: [2.8, 1.9, 2.2] },
      { position: [GX + 2.35, 2.55, GZ + 1.25], size: [1.7, 5.1, 1.7] },
    ],
    footprint: { x: GX + 0.91, z: GZ + 0.49, w: 4.8, d: 3.4, r: 0.45 },
  },
];

type ShapeLike = THREE.Shape | THREE.Path;

function roundedRect(path: ShapeLike, w: number, d: number, r: number) {
  const x = -w / 2;
  const y = -d / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + d - r);
  path.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + d);
  path.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
}

/** Soft ground glow + crisp outline that fades in around the hovered asset. */
function Highlight({ zone, activeRef }: { zone: Zone; activeRef: RefObject<AssetId | null> }) {
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const level = useRef(0);

  const geometry = useMemo(() => {
    const { w, d, r } = zone.footprint;
    const border = 0.09;

    const body = new THREE.Shape();
    roundedRect(body, w, d, r);

    const outer = new THREE.Shape();
    roundedRect(outer, w, d, r);
    const hole = new THREE.Path();
    roundedRect(hole, w - border * 2, d - border * 2, Math.max(0.05, r - border));
    outer.holes.push(hole);

    return { fill: new THREE.ShapeGeometry(body, 24), ring: new THREE.ShapeGeometry(outer, 24) };
  }, [zone]);

  useEffect(
    () => () => {
      geometry.fill.dispose();
      geometry.ring.dispose();
    },
    [geometry],
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    const f = fill.current;
    const r = ring.current;
    if (!g || !f || !r) return;

    const target = activeRef.current === zone.id ? 1 : 0;
    level.current += (target - level.current) * (1 - Math.exp(-dt * 11));
    const l = level.current;

    g.visible = l > 0.01;
    if (!g.visible) return;

    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3.4);
    f.opacity = l * (0.13 + 0.07 * pulse);
    r.opacity = l * (0.7 + 0.25 * pulse);
    g.scale.setScalar(0.975 + 0.025 * l);
  });

  const { x, z } = zone.footprint;

  return (
    <group ref={group} position={[x, 0, z]}>
      <mesh geometry={geometry.fill} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} renderOrder={2}>
        <meshBasicMaterial
          ref={fill}
          color={zone.color}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={geometry.ring} rotation-x={-Math.PI / 2} position={[0, 0.026, 0]} renderOrder={3}>
        <meshBasicMaterial
          ref={ring}
          color={zone.color}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

interface HotspotsProps {
  /** Asset currently highlighted (hover or pinned). */
  activeRef: RefObject<AssetId | null>;
  onHover: (id: AssetId | null) => void;
  onSelect: (id: AssetId) => void;
}

/**
 * Transparent hit volumes over the PV field, the battery bank and the grid station.
 * Only these meshes carry pointer handlers, so raycasting stays trivially cheap.
 * R3F ignores clicks that moved more than 2 px, so orbit drags never trigger navigation.
 */
export function Hotspots({ activeRef, onHover, onSelect }: HotspotsProps) {
  return (
    <group>
      {ZONES.map((zone) => (
        <Highlight key={`ring-${zone.id}`} zone={zone} activeRef={activeRef} />
      ))}

      {ZONES.map((zone) =>
        zone.boxes.map((box, i) => (
          <mesh
            key={`${zone.id}-${i}`}
            position={box.position}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onHover(zone.id);
            }}
            onPointerOut={() => onHover(null)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(zone.id);
            }}
          >
            <boxGeometry args={box.size} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )),
      )}
    </group>
  );
}
