"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import {
  CELL_LAYOUT,
  FALLBACK_LAYOUT,
  createCellTexture,
  createDustTexture,
  createMoteTexture,
} from "@/components/pv-module/textures";
import { GLASS_Z, MODULE_H as H, MODULE_W as W, ModuleBody } from "@/components/pv-module/module-body";

const TILT = -0.62;

export interface PanelSceneProps {
  technology: string;
  bifacial: boolean;
  /** 0 → 1 amount of dust to draw. */
  coverage: number;
  hotspot: boolean;
  /** Seed so each module gets its own dust pattern. */
  seed: number;
  /** "Clean preview": fade the dust layer out. */
  clean: boolean;
  active: boolean;
}

function Module({ technology, bifacial, coverage, hotspot, seed, clean }: Omit<PanelSceneProps, "active">) {
  const layout = CELL_LAYOUT[technology] ?? FALLBACK_LAYOUT;
  const group = useRef<THREE.Group>(null);
  const dustMat = useRef<THREE.MeshStandardMaterial>(null);
  const fade = useRef(0);

  const cells = useMemo(() => createCellTexture(layout), [layout]);
  const dust = useMemo(() => createDustTexture({ coverage, seed, hotspot }), [coverage, seed, hotspot]);
  useEffect(() => () => cells.dispose(), [cells]);
  useEffect(() => {
    fade.current = 0;
    return () => dust.dispose();
  }, [dust]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (g) {
      g.rotation.y = Math.sin(t * 0.28) * 0.2;
      g.position.y = Math.sin(t * 0.55) * 0.025;
    }
    const target = clean ? 0 : 1;
    fade.current += (target - fade.current) * Math.min(1, dt * 2.2);
    if (dustMat.current) dustMat.current.opacity = fade.current;
  });

  return (
    <group ref={group}>
      <group rotation={[TILT, 0, 0]}>
        <ModuleBody layout={layout} bifacial={bifacial} cells={cells}>
          {/* Dust on the glass */}
          <mesh position={[0, 0, GLASS_Z + 0.002]}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial
              ref={dustMat}
              map={dust}
              transparent
              opacity={0}
              roughness={0.95}
              depthWrite={false}
            />
          </mesh>
        </ModuleBody>
      </group>
    </group>
  );
}

/** Airborne dust drifting with the wind; the denser the soiling, the more motes. */
function Motes({ coverage, clean }: { coverage: number; clean: boolean }) {
  const MAX = 420;
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const sprite = useMemo(() => createMoteTexture(), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX * 3);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < MAX; i++) {
      pos[i * 3] = (r() - 0.5) * 4.4;
      pos[i * 3 + 1] = -0.7 + r() * 1.9;
      pos[i * 3 + 2] = (r() - 0.5) * 2.2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => sprite.dispose(), [sprite]);

  const count = Math.round(30 + (MAX - 30) * coverage);

  useFrame((state, dt) => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const a = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      a[k] += (0.16 + (i % 7) * 0.025) * step;
      a[k + 1] += Math.sin(t * 0.8 + i) * 0.04 * step - 0.012 * step;
      a[k + 2] += Math.cos(t * 0.6 + i * 1.3) * 0.03 * step;
      if (a[k] > 2.2) a[k] = -2.2;
      if (a[k + 1] < -0.7) a[k + 1] = 1.2;
    }
    attr.needsUpdate = true;
    geometry.setDrawRange(0, count);
    if (mat.current) {
      const target = clean ? 0.15 : 0.35 + 0.5 * coverage;
      mat.current.opacity += (target - mat.current.opacity) * Math.min(1, dt * 2);
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        ref={mat}
        map={sprite}
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        color="#e2c79c"
      />
    </points>
  );
}

/** Moving sun so the glass shows a travelling glint. */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.15;
    if (light.current) light.current.position.set(Math.sin(t) * 4, 4.5, 3 + Math.cos(t) * 1.5);
  });
  return (
    <directionalLight
      ref={light}
      position={[3, 4.5, 3]}
      intensity={1.6}
      color="#fff3df"
      castShadow
      shadow-mapSize={[1024, 1024]}
    />
  );
}

/** Keeps the whole module in view whatever the canvas aspect ratio. */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const byWidth = (W * 1.32) / (2 * half * aspect);
    const byHeight = (H * 1.9) / (2 * half);
    const dist = Math.max(byWidth, byHeight, 2.6);
    const dir = new THREE.Vector3(0.28, 0.62, 1).normalize();
    cam.position.copy(dir.multiplyScalar(dist));
    cam.lookAt(0, -0.05, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function PanelScene(props: PanelSceneProps) {
  const { active, ...module } = props;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 30, position: [0, 1.2, 3.6], near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0, 0)}
    >
      <CameraFit />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#ffffff", "#d9c6a4", 0.45]} />
      <Sun />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={1.6} position={[0, 4, 3]} scale={[6, 1.2, 1]} rotation-x={Math.PI / 2.6} />
        <Lightformer form="rect" intensity={0.5} position={[-5, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.4} color="#ffe6c2" position={[5, 1, -1]} scale={[3, 6, 1]} rotation-y={-Math.PI / 2} />
      </Environment>

      <Module {...module} />
      <Motes coverage={module.coverage} clean={module.clean} />
      <ContactShadows position={[0, -0.72, 0]} opacity={0.32} scale={6} blur={2.6} far={1.6} color="#5b4329" />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.62}
        rotateSpeed={0.6}
        target={[0, -0.05, 0]}
      />
    </Canvas>
  );
}
