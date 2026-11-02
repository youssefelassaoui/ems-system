/**
 * Deterministic drone-inspection model.
 *
 * A quadcopter with a radiometric thermal camera and an RGB camera flies over every PV system.
 * Each anomaly it finds is tied to one module (inverter → string → module) and described the way
 * thermography reports do (IEC TS 62446-3): type, temperature difference to healthy modules,
 * estimated power loss, affected cells, class of abnormality and the recommended action.
 *
 * Bird droppings from the soiling model show up here as shading hotspots, so both pages agree.
 * Replace `getInspection` with the anomaly export of your inspection provider to use real flights.
 */
import { PV_SYSTEMS, type PvSystemConfig } from "./pv-systems";
import { cellCount, cellLayout, SUBSTRINGS } from "./module-layout";
import { getModuleSoiling, moduleLayout, type ModuleRef } from "./soiling";

export type AnomalyType =
  | "hotCell"
  | "multiCell"
  | "diode"
  | "pid"
  | "junctionBox"
  | "shading"
  | "crack"
  | "offline";

export type Severity = "low" | "medium" | "high" | "critical";

export interface AnomalyKind {
  label: string;
  short: string;
  description: string;
  action: string;
  /** Share of module power lost, min–max. */
  loss: [number, number];
  /** Temperature difference to healthy modules, K. */
  deltaT: [number, number];
  /** Whether the defect can also be seen on the RGB image. */
  visibleInRgb: boolean;
}

export const ANOMALY_KINDS: Record<AnomalyType, AnomalyKind> = {
  hotCell: {
    label: "Single hot cell",
    short: "Hot cell",
    description: "One cell runs hotter than its neighbours — typically a micro-crack, a cell defect or a poor solder bond.",
    action: "Keep under watch; replace the module if the temperature difference keeps rising.",
    loss: [0.012, 0.04],
    deltaT: [9, 26],
    visibleInRgb: false,
  },
  multiCell: {
    label: "Multiple hot cells",
    short: "Multi-cell",
    description: "Several scattered cells are warmer (patchwork pattern) — cell mismatch or early degradation.",
    action: "Check with an IV-curve trace; plan a module swap if the loss is confirmed.",
    loss: [0.04, 0.1],
    deltaT: [6, 15],
    visibleInRgb: false,
  },
  diode: {
    label: "Bypassed substring",
    short: "Bypass diode",
    description: "A third of the module is uniformly warmer: its bypass diode is conducting, so that substring produces nothing.",
    action: "Replace the junction box or the module at the next maintenance visit.",
    loss: [0.31, 0.34],
    deltaT: [4, 8],
    visibleInRgb: false,
  },
  pid: {
    label: "Potential-induced degradation",
    short: "PID",
    description: "Cells near the frame lose output under high system voltage — typical at the negative end of a string.",
    action: "Check array grounding; install a PID-recovery device or swap the affected modules.",
    loss: [0.08, 0.24],
    deltaT: [3, 8],
    visibleInRgb: false,
  },
  junctionBox: {
    label: "Junction box overheating",
    short: "Junction box",
    description: "A hot connection or diode inside the junction box. Little energy is lost, but it is a fire risk.",
    action: "Isolate the string and replace the junction box without delay.",
    loss: [0.004, 0.02],
    deltaT: [22, 44],
    visibleInRgb: false,
  },
  shading: {
    label: "Soiling hotspot",
    short: "Soiling hotspot",
    description: "Bird droppings shade part of a cell, which then heats up.",
    action: "Clean the module and check it again on the next flight.",
    loss: [0.02, 0.06],
    deltaT: [7, 18],
    visibleInRgb: true,
  },
  crack: {
    label: "Cracked glass",
    short: "Broken glass",
    description: "Impact damage on the front glass with hot cells underneath; moisture can get into the laminate.",
    action: "Replace the module and test the string insulation resistance.",
    loss: [0.06, 0.2],
    deltaT: [8, 20],
    visibleInRgb: true,
  },
  offline: {
    label: "Module open circuit",
    short: "Open circuit",
    description: "The whole module is uniformly warmer: it is disconnected (connector or cable) and produces nothing.",
    action: "Check the connectors and cabling of the string.",
    loss: [1, 1],
    deltaT: [3, 6],
    visibleInRgb: false,
  },
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/* ------------------------------------------------------------------ */
/* Flight                                                              */
/* ------------------------------------------------------------------ */

export const MISSION = {
  id: "IR-2611-01",
  /** Days before today. */
  daysAgo: 1,
  start: "10:40",
  end: "13:15",
  drone: "Quadcopter UAV-01",
  thermal: "Thermal 640 × 512",
  rgb: "48 MP RGB camera",
  altitudeM: 30,
  speedMs: 4.2,
  overlap: "80 / 70 %",
  gsdThermalCm: 3.4,
  gsdRgbCm: 0.8,
  irradiance: 872,
  ambientC: 23.4,
  windMs: 2.6,
  images: 3412,
  batteries: 4,
  /** IEC TS 62446-3 asks for ≥ 600 W/m² on the module plane during the flight. */
  minIrradiance: 600,
  nextInDays: 29,
} as const;

/* ------------------------------------------------------------------ */
/* Anomalies                                                           */
/* ------------------------------------------------------------------ */

interface Profile {
  /** Share of modules with a fault (soiling hotspots come on top). */
  rate: number;
  weights: Partial<Record<Exclude<AnomalyType, "shading">, number>>;
  /** Operating temperature of healthy modules during the flight, °C. */
  refTempC: number;
  /** Inverters that were offline during the flight (their strings are open circuit). */
  offlineInverters?: number[];
}

const PROFILES: Record<string, Profile> = {
  "pv-1": { rate: 0.012, weights: { hotCell: 5, multiCell: 2, diode: 2, junctionBox: 1, crack: 1 }, refTempC: 46.2 },
  "pv-2": {
    rate: 0.02,
    weights: { hotCell: 4, multiCell: 4, diode: 3, pid: 5, junctionBox: 1, crack: 1, offline: 1 },
    refTempC: 47.4,
  },
  "pv-3": { rate: 0.006, weights: { hotCell: 4, multiCell: 1, diode: 1, crack: 1 }, refTempC: 48.1 },
  "pv-4": { rate: 0.01, weights: { hotCell: 3, offline: 1, crack: 1 }, refTempC: 49.3 },
  "pv-5": { rate: 0.007, weights: { hotCell: 3, multiCell: 1, junctionBox: 1 }, refTempC: 45.1 },
  "pv-6": { rate: 0.01, weights: { hotCell: 3, diode: 2, crack: 1, offline: 2 }, refTempC: 46.8, offlineInverters: [1] },
};

const DEFAULT_PROFILE: Profile = { rate: 0.01, weights: { hotCell: 3, multiCell: 1, diode: 1 }, refTempC: 46 };

export const inspectionProfile = (cfg: PvSystemConfig) => PROFILES[cfg.id] ?? DEFAULT_PROFILE;

/** Integer hash → [0, 1) (no `Math.sin`, so server and browser agree). */
function hash(a: number, b = 0, c = 0, d = 0) {
  let h = Math.imul((a + 1) | 0, 0x9e3779b1);
  h = Math.imul(h ^ (b | 0), 0x85ebca6b);
  h = Math.imul(h ^ (c | 0), 0xc2b2ae35);
  h = Math.imul(h ^ (d | 0), 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

export interface Anomaly {
  /** "A-2-014" */
  id: string;
  system: number;
  ref: ModuleRef;
  type: AnomalyType;
  severity: Severity;
  /** IEC TS 62446-3 class of abnormality: 2 = thermal abnormality, 3 = safety relevant. */
  iecClass: 2 | 3;
  deltaT: number;
  maxTempC: number;
  refTempC: number;
  /** Share of module power lost. */
  loss: number;
  /** Power lost at STC, W. */
  lossWp: number;
  /** Estimated energy lost over a year, kWh. */
  annualKwh: number;
  /** Affected cells (null on thin film, where there are no discrete cells). */
  cells: number | null;
  totalCells: number | null;
  /** Bypassed substring (0–2), for diode faults. */
  substring?: number;
  /** Centre of the anomaly on the module face, normalised (x along the long edge, y from the top). */
  x: number;
  y: number;
  /** Seed for the exact pattern drawn in the thermal / RGB textures. */
  seed: number;
  confidence: number;
  /** Number of flights on which the anomaly has been seen (1 = new on this flight). */
  flights: number;
}

function severityOf(type: AnomalyType, deltaT: number, loss: number): Severity {
  if (type === "junctionBox" || (type === "crack" && deltaT >= 12)) return "critical";
  if (loss >= 0.3 || type === "crack") return "high";
  if (deltaT >= 16 || loss >= 0.08) return "medium";
  return "low";
}

function pickType(weights: Profile["weights"], t: number, endOfString: boolean): Exclude<AnomalyType, "shading"> {
  const entries = (Object.entries(weights) as [Exclude<AnomalyType, "shading">, number][]).filter(
    ([k]) => k !== "pid" || endOfString,
  );
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let acc = 0;
  for (const [k, w] of entries) {
    acc += w / total;
    if (t < acc) return k;
  }
  return entries[entries.length - 1][0];
}

function makeAnomaly(index: number, ref: ModuleRef, flat: number, type: AnomalyType, n: number): Anomaly {
  const cfg = PV_SYSTEMS[index];
  const prof = inspectionProfile(cfg);
  const kind = ANOMALY_KINDS[type];
  const layout = cellLayout(cfg.technology.short);
  const total = cellCount(layout);
  const h = (k: number) => hash(index, flat, k);

  const deltaT = round(lerp(kind.deltaT, h(1)));
  const loss = lerp(kind.loss, h(2));
  let x = 0.12 + 0.76 * h(3);
  let y = 0.15 + 0.7 * h(4);
  let cells: number | null = 1;
  let substring: number | undefined;

  switch (type) {
    case "multiCell":
      cells = 3 + Math.floor(h(5) * 5);
      break;
    case "diode":
      substring = Math.floor(h(5) * SUBSTRINGS);
      cells = total ? total / SUBSTRINGS : null;
      x = 0.5;
      y = (substring + 0.5) / SUBSTRINGS;
      break;
    case "pid":
      cells = 8 + Math.floor(h(5) * 12);
      x = 0.14;
      y = 0.5;
      break;
    case "junctionBox":
      cells = null;
      x = 0.5;
      y = 0.14;
      break;
    case "crack":
      cells = 2 + Math.floor(h(5) * 4);
      break;
    case "offline":
      cells = total;
      x = 0.5;
      y = 0.5;
      break;
  }
  if (!total && type !== "offline" && type !== "diode") cells = null;

  const dailyKwhPerKwp = (cfg.last29DaysMwh * 1000) / 29 / cfg.kWp;
  return {
    id: `A-${index + 1}-${String(n).padStart(3, "0")}`,
    system: index,
    ref,
    type,
    severity: severityOf(type, deltaT, loss),
    iecClass: type === "junctionBox" || type === "crack" || deltaT >= 20 ? 3 : 2,
    deltaT,
    refTempC: prof.refTempC,
    maxTempC: round(prof.refTempC + deltaT + (h(6) - 0.5) * 0.8),
    loss,
    lossWp: cfg.moduleWp * loss,
    annualKwh: (cfg.moduleWp / 1000) * dailyKwhPerKwp * 365 * loss,
    cells,
    totalCells: total,
    substring,
    x,
    y,
    seed: (index + 1) * 100003 + flat,
    confidence: type === "offline" || type === "diode" ? 0.97 + 0.02 * h(7) : 0.84 + 0.14 * h(7),
    flights: h(8) < 0.42 ? 1 : 2 + Math.floor(h(9) * 4),
  };
}

export interface SystemInspection {
  anomalies: Anomaly[];
  /** Flat module index → anomaly. */
  byModule: Map<number, Anomaly>;
  modules: number;
  refTempC: number;
  offlineInverters: number[];
}

const cache = new Map<number, SystemInspection>();

export function moduleIndex(cfg: PvSystemConfig, ref: ModuleRef) {
  const { stringsPerInverter, modulesPerString } = moduleLayout(cfg);
  return (ref.inverter * stringsPerInverter + ref.string) * modulesPerString + ref.module;
}

/** All anomalies of one PV system, sorted by severity then power loss. */
export function getInspection(index: number): SystemInspection {
  const hit = cache.get(index);
  if (hit) return hit;

  const cfg = PV_SYSTEMS[index];
  const prof = inspectionProfile(cfg);
  const { inverters, stringsPerInverter, modulesPerString } = moduleLayout(cfg);
  const found: { ref: ModuleRef; flat: number; type: AnomalyType }[] = [];

  for (let k = 0; k < inverters; k++)
    for (let s = 0; s < stringsPerInverter; s++)
      for (let m = 0; m < modulesPerString; m++) {
        const ref = { inverter: k, string: s, module: m };
        const flat = moduleIndex(cfg, ref);
        if (getModuleSoiling(index, ref, 0).hotspot) {
          found.push({ ref, flat, type: "shading" });
        } else if (hash(index, flat, 101) < prof.rate) {
          const end = m <= 1 || m >= modulesPerString - 2;
          found.push({ ref, flat, type: pickType(prof.weights, hash(index, flat, 102), end) });
        }
      }

  const anomalies = found
    .map((f, n) => makeAnomaly(index, f.ref, f.flat, f.type, n + 1))
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.loss - a.loss);
  const result: SystemInspection = {
    anomalies,
    byModule: new Map(anomalies.map((a) => [moduleIndex(cfg, a.ref), a])),
    modules: cfg.modules,
    refTempC: prof.refTempC,
    offlineInverters: prof.offlineInverters ?? [],
  };
  cache.set(index, result);
  return result;
}

export function anomalyAt(index: number, ref: ModuleRef) {
  return getInspection(index).byModule.get(moduleIndex(PV_SYSTEMS[index], ref)) ?? null;
}

/** Temperature of a healthy module during the flight (small spread around the reference). */
export function healthyTempC(index: number, ref: ModuleRef) {
  const cfg = PV_SYSTEMS[index];
  return round(inspectionProfile(cfg).refTempC + (hash(index, moduleIndex(cfg, ref), 201) - 0.5) * 1.6);
}

export function severityRank(s: Severity) {
  return SEVERITY_RANK[s];
}

export function fleetInspection() {
  const systems = PV_SYSTEMS.map((_, i) => getInspection(i));
  const all = systems.flatMap((s) => s.anomalies);
  return {
    systems,
    all,
    critical: all.filter((a) => a.severity === "critical").length,
    newOnes: all.filter((a) => a.flights === 1).length,
    lossWp: all.reduce((s, a) => s + a.lossWp, 0),
    annualKwh: all.reduce((s, a) => s + a.annualKwh, 0),
    hottest: all.reduce((best, a) => (a.deltaT > best.deltaT ? a : best), all[0]),
  };
}
