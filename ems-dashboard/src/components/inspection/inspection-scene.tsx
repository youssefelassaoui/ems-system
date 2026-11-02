"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import type { Anomaly } from "@/lib/inspection";
import { cellLayout } from "@/lib/module-layout";
import { createCellTexture, createDustTexture } from "@/components/pv-module/textures";
import { GLASS_Z, MODULE_H as H, MODULE_W as W, ModuleBody, type ModuleTint } from "@/components/pv-module/module-body";
import { paletteHex, type ThermalPalette } from "./ironbow";
import { createMarkerTexture, createRgbDefectTexture, createThermalField, createThermalTexture } from "./thermal";

const TILT = -0.62;
const TARGET = new THREE.Vector3(0.1, 0.1, 0);

export type InspectionMode = "thermal" | "rgb";

export interface InspectionSceneProps {
  technology: string;
  bifacial: boolean;
  anomaly: Anomaly | null;
  baseTempC: number;
  range: { min: number; max: number };
  palette: ThermalPalette;
  /** Dust on the glass, from the soiling model (0 → 1). */
  dust: number;
  seed: number;
  mode: InspectionMode;
  markerColor: string;
  active: boolean;
}

function InspectedModule({
  technology,
  bifacial,
  anomaly,
  baseTempC,
  range,
  palette,
  dust,
  seed,
  mode,
  markerColor,
}: Omit<InspectionSceneProps, "active">) {
  const layout = cellLayout(technology);
  const sway = useRef<THREE.Group>(null);
  const thermalMat = useRef<THREE.MeshBasicMaterial>(null);
  const thermalMarkerMat = useRef<THREE.MeshBasicMaterial>(null);
  const rgbMarkerMat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(0);
  const isThermal = mode === "thermal";

  const cells = useMemo(() => createCellTexture(layout), [layout]);
  const dustTex = useMemo(() => createDustTexture({ coverage: dust, seed, hotspot: false }), [dust, seed]);
  const defects = useMemo(() => createRgbDefectTexture(anomaly), [anomaly]);
  const field = useMemo(() => createThermalField(layout, anomaly, baseTempC, seed), [layout, anomaly, baseTempC, seed]);
  const thermal = useMemo(() => createThermalTexture(field, range, palette), [field, range, palette]);
  const thermalMarker = useMemo(
    () => (anomaly ? createMarkerTexture(layout, anomaly, markerColor, field.peak) : null),
    [layout, anomaly, markerColor, field],
  );
  const rgbMarker = useMemo(
    () => (anomaly ? createMarkerTexture(layout, anomaly, markerColor, null) : null),
    [layout, anomaly, markerColor],
  );

  // Frame, rear, junction boxes and rails in the same palette as the image.
  const tint = useMemo<ModuleTint | undefined>(() => {
    if (!isThermal) return undefined;
    const at = (T: number) => paletteHex(palette, (T - range.min) / (range.max - range.min));
    return {
      frame: at(baseTempC - 5),
      rear: at(baseTempC + 1.5),
      junctionBox: anomaly?.type === "junctionBox" ? at(anomaly.maxTempC) : at(baseTempC + 4),
      rail: at(baseTempC - 3.5),
    };
  }, [isThermal, palette, range, baseTempC, anomaly]);

  useEffect(() => () => cells.dispose(), [cells]);
  useEffect(() => () => dustTex.dispose(), [dustTex]);
  useEffect(() => () => defects.dispose(), [defects]);
  useEffect(() => () => thermal.dispose(), [thermal]);
  useEffect(() => () => thermalMarker?.dispose(), [thermalMarker]);
  useEffect(() => () => rgbMarker?.dispose(), [rgbMarker]);
  // A newly selected module develops like a fresh capture.
  useEffect(() => {
    fade.current = 0;
  }, [field]);

  useFrame((state, dt) => {
    if (sway.current) sway.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.22) * 0.12;
    const target = isThermal ? 1 : 0;
    fade.current += (target - fade.current) * Math.min(1, Math.min(dt, 0.5) * 7);
    if (Math.abs(target - fade.current) < 0.002) fade.current = target;
    const f = fade.current;
    if (thermalMat.current) {
      thermalMat.current.opacity = f;
      thermalMat.current.visible = f > 0.002;
    }
    if (thermalMarkerMat.current) thermalMarkerMat.current.opacity = isThermal ? f * f : 0;
    if (rgbMarkerMat.current) rgbMarkerMat.current.opacity = isThermal ? 0 : 1 - f;
  });

  return (
    <group ref={sway}>
      <group rotation={[TILT, 0, 0]}>
        <ModuleBody layout={layout} bifacial={bifacial} cells={cells} tint={tint}>
          {/* RGB: dust and visible damage on the glass */}
          <mesh position={[0, 0, GLASS_Z + 0.002]}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial map={dustTex} transparent roughness={0.95} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0, GLASS_Z + 0.003]}>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial map={defects} transparent roughness={0.7} depthWrite={false} />
          </mesh>
          {/* Radiometric image: emitted heat, so it is unlit */}
          <mesh position={[0, 0, GLASS_Z + 0.005]}>
            <planeGeometry args={[W, H]} />
            <meshBasicMaterial ref={thermalMat} map={thermal} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
          {thermalMarker && (
            <mesh position={[0, 0, GLASS_Z + 0.009]}>
              <planeGeometry args={[W, H]} />
              <meshBasicMaterial
                ref={thermalMarkerMat}
                map={thermalMarker}
                transparent
                opacity={0}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )}
          {rgbMarker && (
            <mesh position={[0, 0, GLASS_Z + 0.01]}>
              <planeGeometry args={[W, H]} />
              <meshBasicMaterial ref={rgbMarkerMat} map={rgbMarker} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </ModuleBody>
      </group>
    </group>
  );
}

/** Frames the module whatever the canvas aspect ratio, leaving room for the overlays. */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const byWidth = (W * (aspect < 1 ? 1.8 : 1.42)) / (2 * half * aspect);
    const byHeight = (H * 2.35) / (2 * half);
    const dist = Math.max(byWidth, byHeight, 2.6);
    const dir = new THREE.Vector3(0.18, 0.5, 1).normalize();
    cam.position.copy(dir.multiplyScalar(dist)).add(TARGET);
    cam.lookAt(TARGET);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function InspectionScene(props: InspectionSceneProps) {
  const { active, ...module } = props;
  const thermal = module.mode === "thermal";
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ fov: 30, position: [0, 1.4, 4], near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0, 0)}
    >
      <CameraFit />
      <ambientLight intensity={0.3} />
      <hemisphereLight args={["#ffffff", "#c9c2d6", 0.5]} />
      <directionalLight position={[3, 5, 3]} intensity={1.6} color="#fff6e8" castShadow shadow-mapSize={[1024, 1024]} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={1.6} position={[0, 4, 3]} scale={[6, 1.2, 1]} rotation-x={Math.PI / 2.6} />
        <Lightformer form="rect" intensity={0.5} position={[-5, 1, 1]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.4} position={[5, 1, -1]} scale={[3, 6, 1]} rotation-y={-Math.PI / 2} />
      </Environment>

      <InspectedModule {...module} />
      <ContactShadows
        position={[0, -0.72, 0]}
        opacity={thermal ? 0.5 : 0.3}
        scale={6}
        blur={2.6}
        far={2.4}
        color={thermal ? "#000000" : "#1f2937"}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.62}
        rotateSpeed={0.6}
        target={TARGET}
      />
    </Canvas>
  );
}
