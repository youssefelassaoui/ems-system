import type { RefObject } from "react";
import type { EnergyFlows } from "@/lib/simulation";
import { ENERGY } from "@/lib/palette";

/** Data pushed into the 3D scene from React (≈1 Hz). */
export interface SceneInput {
  flows: EnergyFlows;
  daylight: number;
  minute: number;
  selfSufficiency: number;
}

/** Values eased every frame inside the render loop. */
export interface SceneSmooth {
  pv: number;
  load: number;
  /** Positive = discharging, negative = charging. */
  battery: number;
  /** Positive = importing, negative = exporting. */
  grid: number;
  soc: number;
  daylight: number;
  minute: number;
}

export type SmoothRef = RefObject<SceneSmooth>;

export function toSmooth(input: SceneInput): SceneSmooth {
  return {
    pv: input.flows.pv,
    load: input.flows.load,
    battery: input.flows.batteryNet,
    grid: input.flows.gridNet,
    soc: input.flows.soc,
    daylight: input.daylight,
    minute: input.minute,
  };
}

/** Reference values used to normalise flow intensity. */
export const REF = {
  pv: 1800,
  load: 900,
  battery: 1000,
  grid: 900,
} as const;

/** Energy colours of the scene — the same ones the charts and chips use. */
export const COLORS = {
  pv: ENERGY.solar.main,
  battery: ENERGY.battery.main,
  grid: ENERGY.grid.main,
  load: ENERGY.load.main,
  /** Neutral materials. */
  cable: "#dde3ec",
  white: "#f8f9fc",
  frame: "#eceff4",
  navy: "#0d1b3e",
} as const;

/** Imperative handle used by the HUD buttons. */
export interface SceneApi {
  zoomBy: (factor: number) => void;
  reset: () => void;
}

/** Normalised, dead-banded flow intensity in [0, 1]. */
export function intensity(value: number, reference: number) {
  const v = Math.abs(value);
  if (v < 3) return 0;
  return Math.min(1, Math.sqrt(v / reference));
}

export const PATH_Y = 0.1;

export const NODE = {
  hub: [0, 0, 0],
  pv: [-4.6, 0, -2.9],
  battery: [4.8, 0, -3.0],
  grid: [4.55, 0, 3.3],
  campus: [-5.0, 0, 3.4],
} as const;
