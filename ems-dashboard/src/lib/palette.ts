/**
 * Energy palette — every source keeps the same colour across the whole platform.
 *
 *   solar   → sun amber / orange
 *   battery → storage green
 *   grid    → network indigo
 *   load    → campus blue (also the brand colour of the interface itself)
 *   dust    → sand, for module soiling
 *   thermal → crimson, for the drone thermal inspection
 *
 * Charts and the 3D scene read the hex values below. KPI tiles and other *data* widgets
 * wrap themselves in the matching `data-accent` scope so their chrome follows the source.
 * Page chrome never remaps — it always stays the brand blue.
 */

export type EnergyKey = "solar" | "battery" | "grid" | "load" | "dust" | "thermal";

export interface EnergyTone {
  label: string;
  /** Line / area colour in charts and the 3D flow. */
  main: string;
  /** Lighter companion — second series, fills, hatching. */
  soft: string;
  /** Darker companion — text on white, strokes. */
  deep: string;
  /** Icon-tile gradient. */
  gradient: string;
}

export const ENERGY: Record<EnergyKey, EnergyTone> = {
  solar: {
    label: "Solar PV",
    main: "#f59e0b",
    soft: "#fcd34d",
    deep: "#c2570c",
    gradient: "linear-gradient(135deg,#fbbf24,#ea7a0a)",
  },
  battery: {
    label: "Battery",
    main: "#10b981",
    soft: "#6ee7b7",
    deep: "#047857",
    gradient: "linear-gradient(135deg,#34d399,#0a8c61)",
  },
  grid: {
    label: "Grid",
    main: "#5b6cf5",
    soft: "#a8b4ff",
    deep: "#3f4ec9",
    gradient: "linear-gradient(135deg,#7b8cff,#4f63e8)",
  },
  load: {
    label: "Campus load",
    main: "#2f6bff",
    soft: "#96b8ff",
    deep: "#1541c0",
    gradient: "linear-gradient(135deg,#7eb0ff,#2f6bff)",
  },
  dust: {
    label: "Soiling",
    main: "#b7834a",
    soft: "#dcb98a",
    deep: "#7f5431",
    gradient: "linear-gradient(135deg,#d9b27a,#9c6a3a)",
  },
  thermal: {
    label: "Thermal",
    main: "#e11d48",
    soft: "#fda4af",
    deep: "#9f1239",
    gradient: "linear-gradient(135deg,#fb7185,#be123c)",
  },
};

/** Which energy colour belongs to each clickable 3D asset. */
export const ASSET_ACCENT = { pv: "solar", battery: "battery", grid: "grid" } as const;

/** Time-of-use tariffs read like prices everywhere: cheap = green, shoulder = amber, expensive = red. */
export const TARIFF_COLOR = {
  offpeak: "#34d399",
  day: "#fbbf24",
  peak: "#f43f5e",
} as const;

/** Neutral chart furniture shared by every chart. */
export const CHART = {
  axis: "#8a9bbd",
  grid: "#e4ebf7",
  night: "#eaf0fa",
  zero: "#b9c6df",
  /** Follow the surrounding accent scope, so "NOW" and hover cursors match the page. */
  now: "var(--color-brand-600)",
  cursor: "var(--color-brand-300)",
  ink: "#0d1b3e",
} as const;

/** Blend a hex colour towards black (amount > 0) or white (amount < 0). */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const target = amount >= 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * k);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
