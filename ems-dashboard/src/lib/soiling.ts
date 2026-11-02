/**
 * Deterministic soiling model.
 *
 * Dust settles on every PV system at its own daily rate (tilt, surface and site exposure),
 * a sand-wind episode adds a layer for everyone, rain washes part of it away and manual
 * cleaning resets a system. Each module then deviates from its system average: strings on
 * the windward edge and modules at the end of a string catch more dust, and a few modules
 * carry bird droppings (a local hotspot).
 *
 * Replace `getSystemSoiling` / `getModuleSoiling` with soiling-station or IV-curve data
 * to drive the page from real measurements.
 */
import { PV_SYSTEMS, TOTAL_KWP, type PvSystemConfig } from "./pv-systems";

/** Days of history shown in the soiling chart (today included). */
export const HISTORY_DAYS = 30;
/** Soiling loss above which a system should be cleaned. */
export const CLEAN_THRESHOLD = 0.05;
/** Extra loss carried by a module with bird droppings. */
const HOTSPOT_LOSS = 0.028;
/** Residual loss right after a cleaning. */
const RESIDUAL = 0.0025;

/** Site events, in days before today. */
export const SOILING_EVENTS = [
  { daysAgo: 9, kind: "rain", label: "Rain" },
  { daysAgo: 4, kind: "wind", label: "Sand wind" },
] as const;
const STORM_LOSS = 0.006;

interface SoilingParams {
  /** Dust accumulation, as loss per day. */
  rate: number;
  /** Days since the last manual cleaning (may be older than the history window). */
  cleanedDaysAgo: number;
  /** Steeper modules shed more dust when it rains (trackers stow steep). */
  tiltDeg: number;
}

const PARAMS: Record<string, SoilingParams> = {
  "pv-1": { rate: 0.0017, cleanedDaysAgo: 12, tiltDeg: 15 },
  "pv-2": { rate: 0.0021, cleanedDaysAgo: 17, tiltDeg: 10 },
  "pv-3": { rate: 0.0013, cleanedDaysAgo: 6, tiltDeg: 45 },
  "pv-4": { rate: 0.0029, cleanedDaysAgo: 41, tiltDeg: 10 },
  "pv-5": { rate: 0.001, cleanedDaysAgo: 21, tiltDeg: 25 },
  "pv-6": { rate: 0.0019, cleanedDaysAgo: 4, tiltDeg: 8 },
};

const DEFAULT_PARAMS: SoilingParams = { rate: 0.0015, cleanedDaysAgo: 14, tiltDeg: 15 };

/** Integer hash → [0, 1). No `Math.sin`: its last digits differ between Node and browsers (hydration). */
function hash(a: number, b = 0, c = 0) {
  let h = Math.imul(Math.round(a * 1000) | 0, 0x9e3779b1);
  h = Math.imul(h ^ (Math.round(b * 1000) | 0), 0x85ebca6b);
  h = Math.imul(h ^ (Math.round(c * 1000) | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function soilingParams(cfg: PvSystemConfig) {
  return PARAMS[cfg.id] ?? DEFAULT_PARAMS;
}

/**
 * End-of-day soiling loss for the last days, oldest first. Index `HISTORY_DAYS - 1` is
 * yesterday's close; today's live value is added by `getSystemSoiling`.
 */
function dailyHistory(cfg: PvSystemConfig, index: number): number[] {
  const p = soilingParams(cfg);
  const washShare = Math.min(0.8, 0.35 + 0.01 * p.tiltDeg);
  const span = Math.max(HISTORY_DAYS + 1, p.cleanedDaysAgo + 1);
  let loss = RESIDUAL;
  const out: number[] = [];
  // Walk from the last cleaning (or the start of the window) up to yesterday.
  for (let daysAgo = span; daysAgo >= 1; daysAgo--) {
    if (daysAgo === p.cleanedDaysAgo) loss = RESIDUAL;
    else loss += p.rate * (0.7 + 0.6 * hash(index + 1, daysAgo));
    for (const e of SOILING_EVENTS) {
      if (e.daysAgo !== daysAgo) continue;
      if (e.kind === "rain") loss *= 1 - washShare;
      else loss += STORM_LOSS;
    }
    if (daysAgo < HISTORY_DAYS) out.push(loss);
  }
  return out;
}

const historyCache = new Map<string, number[]>();

function history(cfg: PvSystemConfig, index: number) {
  let h = historyCache.get(cfg.id);
  if (!h) {
    h = dailyHistory(cfg, index);
    historyCache.set(cfg.id, h);
  }
  return h;
}

export interface SystemSoiling {
  /** Live soiling loss (0–1): share of production lost to dust right now. */
  loss: number;
  /** Soiling ratio = 1 − loss (1 = perfectly clean). */
  ratio: number;
  /** Daily accumulation, loss per day. */
  ratePerDay: number;
  cleanedDaysAgo: number;
  /** Loss per day over the window, oldest first, today last (live). */
  history: number[];
  needsCleaning: boolean;
}

/** Soiling of one PV system at the given minute of today. */
export function getSystemSoiling(index: number, minute: number): SystemSoiling {
  const cfg = PV_SYSTEMS[index];
  const p = soilingParams(cfg);
  const past = history(cfg, index);
  const yesterday = past[past.length - 1] ?? RESIDUAL;
  const loss = yesterday + p.rate * (0.7 + 0.6 * hash(index + 1, 0)) * (minute / 1440);
  return {
    loss,
    ratio: 1 - loss,
    ratePerDay: p.rate,
    cleanedDaysAgo: p.cleanedDaysAgo,
    history: [...past, loss],
    needsCleaning: loss >= CLEAN_THRESHOLD,
  };
}

/** Capacity-weighted soiling of the whole fleet, per day (today last). */
export function fleetSoilingHistory(minute: number) {
  const all = PV_SYSTEMS.map((_, i) => getSystemSoiling(i, minute).history);
  return all[0].map((_, d) =>
    PV_SYSTEMS.reduce((s, p, i) => s + all[i][d] * p.kWp, 0) / TOTAL_KWP,
  );
}

/* ------------------------------------------------------------------ */
/* Modules                                                             */
/* ------------------------------------------------------------------ */

export interface ModuleLayout {
  inverters: number;
  stringsPerInverter: number;
  modulesPerString: number;
}

export function moduleLayout(cfg: PvSystemConfig): ModuleLayout {
  return {
    inverters: cfg.inverters.count,
    stringsPerInverter: Math.round(cfg.stringCount / cfg.inverters.count),
    modulesPerString: cfg.modulesPerString,
  };
}

interface ModuleField {
  /** Multiplier of the system loss, mean 1. Index = string × modulesPerString + module. */
  factor: Float32Array;
  hotspot: Uint8Array;
}

const fieldCache = new Map<string, ModuleField>();

function moduleField(cfg: PvSystemConfig, index: number): ModuleField {
  const cached = fieldCache.get(cfg.id);
  if (cached) return cached;

  const strings = cfg.stringCount;
  const n = cfg.modulesPerString;
  const factor = new Float32Array(strings * n);
  const hotspot = new Uint8Array(strings * n);
  let sum = 0;
  for (let s = 0; s < strings; s++) {
    // The first strings face the prevailing wind (and the access road): more dust.
    const windward = 1 + 0.32 * Math.exp(-s / 3);
    for (let m = 0; m < n; m++) {
      const end = m === 0 || m === n - 1 ? 1.1 : 1;
      const patch = 0.8 + 0.4 * hash(index + 11, s * 0.37, Math.floor(m / 4));
      const grain = 0.9 + 0.2 * hash(index + 23, s, m);
      const f = windward * end * patch * grain;
      factor[s * n + m] = f;
      sum += f;
      if (hash(index + 41, s * 1.7, m * 2.3) < 0.016) hotspot[s * n + m] = 1;
    }
  }
  const mean = sum / factor.length;
  for (let i = 0; i < factor.length; i++) factor[i] /= mean;

  const field = { factor, hotspot };
  fieldCache.set(cfg.id, field);
  return field;
}

export interface ModuleRef {
  /** 0-based inverter index. */
  inverter: number;
  /** 0-based string index inside the inverter. */
  string: number;
  /** 0-based module position inside the string. */
  module: number;
}

export interface ModuleSoiling {
  loss: number;
  /** Bird droppings: a local hotspot on top of the dust. */
  hotspot: boolean;
}

function flatIndex(cfg: PvSystemConfig, ref: ModuleRef) {
  const { stringsPerInverter, modulesPerString } = moduleLayout(cfg);
  return (ref.inverter * stringsPerInverter + ref.string) * modulesPerString + ref.module;
}

export function getModuleSoiling(index: number, ref: ModuleRef, systemLoss: number): ModuleSoiling {
  const cfg = PV_SYSTEMS[index];
  const field = moduleField(cfg, index);
  const i = flatIndex(cfg, ref);
  const hot = field.hotspot[i] === 1;
  return {
    loss: Math.min(0.35, systemLoss * field.factor[i] + (hot ? HOTSPOT_LOSS : 0)),
    hotspot: hot,
  };
}

/**
 * Default selection: the module closest to the system average (no droppings), so the 3D view
 * shows what the system looks like as a whole.
 */
export function typicalModule(index: number): ModuleRef {
  const cfg = PV_SYSTEMS[index];
  const field = moduleField(cfg, index);
  const { stringsPerInverter, modulesPerString } = moduleLayout(cfg);
  let best = -1;
  for (let i = 0; i < field.factor.length; i++) {
    if (field.hotspot[i]) continue;
    if (best < 0 || Math.abs(field.factor[i] - 1) < Math.abs(field.factor[best] - 1)) best = i;
  }
  best = Math.max(0, best);
  const stringFlat = Math.floor(best / modulesPerString);
  return {
    inverter: Math.floor(stringFlat / stringsPerInverter),
    string: stringFlat % stringsPerInverter,
    module: best % modulesPerString,
  };
}

/** Mean loss of the strings fed into one inverter. */
export function inverterSoiling(index: number, inverter: number, systemLoss: number) {
  const cfg = PV_SYSTEMS[index];
  const { stringsPerInverter, modulesPerString } = moduleLayout(cfg);
  let sum = 0;
  for (let s = 0; s < stringsPerInverter; s++)
    for (let m = 0; m < modulesPerString; m++)
      sum += getModuleSoiling(index, { inverter, string: s, module: m }, systemLoss).loss;
  return sum / (stringsPerInverter * modulesPerString);
}

/** "INV 2 · S2.07 · M14" */
export function moduleLabel(ref: ModuleRef) {
  return `INV ${ref.inverter + 1} · S${ref.inverter + 1}.${String(ref.string + 1).padStart(2, "0")} · M${ref.module + 1}`;
}

export function stringLabel(inverter: number, string: number) {
  return `S${inverter + 1}.${String(string + 1).padStart(2, "0")}`;
}

export type SoilingLevel = "clean" | "light" | "moderate" | "heavy";

export function soilingLevel(loss: number): SoilingLevel {
  if (loss < 0.01) return "clean";
  if (loss < 0.03) return "light";
  if (loss < CLEAN_THRESHOLD) return "moderate";
  return "heavy";
}

export const LEVEL_LABEL: Record<SoilingLevel, string> = {
  clean: "Clean",
  light: "Light dust",
  moderate: "Moderate",
  heavy: "Heavy — clean now",
};

/** Upper end of the colour scale used for modules and the 3D dust layer. */
export const SCALE_MAX = 0.12;

/** 0 → 1 amount of dust to draw for a given loss (perceptual, so small losses stay faint). */
export function dustCoverage(loss: number) {
  return Math.pow(Math.min(1, Math.max(0, loss / SCALE_MAX)), 0.85);
}
