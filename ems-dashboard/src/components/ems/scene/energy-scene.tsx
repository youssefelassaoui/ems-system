"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { AssetId } from "@/lib/assets";
import { clamp } from "@/lib/simulation";
import { BatteryBank } from "./battery-bank";
import { Campus } from "./campus";
import { FlowLine, type FlowState } from "./flow-line";
import { GridStation } from "./grid-station";
import { Hotspots } from "./hotspots";
import { Hub } from "./hub";
import { LabelProjector, type LabelRefs } from "./labels";
import { SceneLights } from "./lighting";
import { Platform, ShadowCatcher } from "./platform";
import { PvField } from "./pv-field";
import {
  COLORS,
  PATH_Y,
  REF,
  intensity,
  toSmooth,
  type SceneApi,
  type SceneInput,
  type SceneSmooth,
  type SmoothRef,
} from "./types";

const HOME: [number, number, number] = [16.6, 12.2, 17.6];
const TARGET = new THREE.Vector3(0, 0.3, 0);
const Y = PATH_Y;

/* Cables start on the hub pedestal and end at each asset. */
const PATHS = {
  pv: [
    [0, Y, -1.3],
    [0, Y, -2.1],
    [-1.5, Y, -2.1],
  ],
  load: [
    [-1.3, Y, 0.15],
    [-3.0, Y, 0.15],
    [-3.0, Y, 3.4],
    [-3.65, Y, 3.4],
  ],
  battery: [
    [1.3, Y, -0.15],
    [4.8, Y, -0.15],
    [4.8, Y, -1.2],
  ],
  grid: [
    [0.15, Y, 1.3],
    [0.15, Y, 3.3],
    [3.75, Y, 3.3],
  ],
} as const;

/* "dir" is relative to each path (hub → asset = +1). */
const pvFlow = (s: SceneSmooth): FlowState => ({ level: intensity(s.pv, REF.pv), dir: -1 });
const loadFlow = (s: SceneSmooth): FlowState => ({ level: intensity(s.load, REF.load), dir: 1 });
const batteryFlow = (s: SceneSmooth): FlowState => ({
  level: intensity(s.battery, REF.battery),
  dir: s.battery > 0 ? -1 : 1,
});
const gridFlow = (s: SceneSmooth): FlowState => ({
  level: intensity(s.grid, REF.grid),
  dir: s.grid > 0 ? -1 : 1,
});

function SceneDriver({ target, smooth }: { target: RefObject<SceneInput>; smooth: SmoothRef }) {
  useFrame((_, dt) => {
    const t = target.current;
    const s = smooth.current;
    const k = 1 - Math.exp(-dt * 2.4);
    /* eslint-disable react-hooks/immutability -- per-frame smoothing mutates a shared ref on purpose,
       so the 3D scene never triggers a React re-render. */
    s.pv += (t.flows.pv - s.pv) * k;
    s.load += (t.flows.load - s.load) * k;
    s.battery += (t.flows.batteryNet - s.battery) * k;
    s.grid += (t.flows.gridNet - s.grid) * k;
    s.soc += (t.flows.soc - s.soc) * k;
    s.daylight += (t.daylight - s.daylight) * k;
    const dm = t.minute - s.minute;
    s.minute = Math.abs(dm) > 600 ? t.minute : s.minute + dm * k;
    /* eslint-enable react-hooks/immutability */
  });
  return null;
}

interface OrbitLike {
  target: THREE.Vector3;
  update: () => void;
}

function CameraRig({ apiRef }: { apiRef: RefObject<SceneApi | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  // Widen the field of view on narrow canvases so the whole platform stays visible.
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    // eslint-disable-next-line react-hooks/immutability -- three.js cameras are configured imperatively
    camera.fov = clamp(28 * Math.pow(1.7 / aspect, 0.85), 28, 62);
    camera.updateProjectionMatrix();
  }, [size, camera]);

  useEffect(() => {
    apiRef.current = {
      zoomBy(factor) {
        const target = controls?.target ?? TARGET;
        const dir = camera.position.clone().sub(target);
        dir.setLength(clamp(dir.length() * factor, 15, 42));
        camera.position.copy(target).add(dir);
        controls?.update();
      },
      reset() {
        camera.position.set(...HOME);
        controls?.target.copy(TARGET);
        controls?.update();
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [camera, controls, apiRef]);

  return null;
}

interface EnergySceneProps {
  input: SceneInput;
  autoRotate: boolean;
  active: boolean;
  apiRef: RefObject<SceneApi | null>;
  labelsRef: LabelRefs;
  /** Asset outlined on the ground (hovered or pinned). */
  highlight: AssetId | null;
  onHover: (id: AssetId | null) => void;
  onSelect: (id: AssetId) => void;
  /** A click landed on empty space. */
  onMiss: () => void;
}

export default function EnergyScene({
  input,
  autoRotate,
  active,
  apiRef,
  labelsRef,
  highlight,
  onHover,
  onSelect,
  onMiss,
}: EnergySceneProps) {
  const target = useRef<SceneInput>(input);
  const smooth = useRef<SceneSmooth>(toSmooth(input));
  const activeAsset = useRef<AssetId | null>(highlight);
  const [dragging, setDragging] = useState(false);
  const resume = useRef<number | undefined>(undefined);

  useEffect(() => {
    target.current = input;
  }, [input]);

  useEffect(() => {
    activeAsset.current = highlight;
  }, [highlight]);

  useEffect(() => () => window.clearTimeout(resume.current), []);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: HOME, fov: 28, near: 0.5, far: 180 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      onPointerMissed={onMiss}
    >
      <SceneDriver target={target} smooth={smooth} />
      <SceneLights smooth={smooth} />

      <Platform />
      <ShadowCatcher />

      <PvField smooth={smooth} />
      <BatteryBank smooth={smooth} />
      <GridStation />
      <Campus smooth={smooth} />
      <Hub smooth={smooth} />

      <FlowLine points={PATHS.pv} color={COLORS.pv} smooth={smooth} getFlow={pvFlow} />
      <FlowLine points={PATHS.load} color={COLORS.load} smooth={smooth} getFlow={loadFlow} />
      <FlowLine points={PATHS.battery} color={COLORS.battery} smooth={smooth} getFlow={batteryFlow} />
      <FlowLine points={PATHS.grid} color={COLORS.grid} smooth={smooth} getFlow={gridFlow} />

      <Hotspots activeRef={activeAsset} onHover={onHover} onSelect={onSelect} />

      <LabelProjector labelsRef={labelsRef} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.6}
        minPolarAngle={0.5}
        maxPolarAngle={1.36}
        target={TARGET}
        autoRotate={autoRotate && !dragging}
        autoRotateSpeed={0.45}
        onStart={() => {
          window.clearTimeout(resume.current);
          setDragging(true);
        }}
        onEnd={() => {
          resume.current = window.setTimeout(() => setDragging(false), 4500);
        }}
      />
      <CameraRig apiRef={apiRef} />
    </Canvas>
  );
}
