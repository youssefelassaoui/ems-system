/**
 * Deterministic EMS simulation.
 *
 * A full "demo day" is pre-computed once at minute resolution (irradiance with
 * cloud events, PV output per array, site load, battery dispatch and grid
 * exchange). The dashboard then samples this model at the simulated clock and
 * adds a small amount of smooth telemetry noise so the figures feel live.
 *
 * Replace `getSnapshot` with a real data source (MQTT, REST, Modbus gateway…)
 * to plug the platform into a physical installation.
 */
import { BATTERY, SITE } from "./site";
import {
  PV_SYSTEMS,
  TOTAL_KWP,
  type PvProfile,
  type PvSystemConfig,
} from "./pv-systems";

export const DAY_MINUTES = 1440;
export const SUNRISE_MIN = 7 * 60 + 8;
export const SUNSET_MIN = 18 * 60 + 22;
export const SOLAR_NOON_MIN = (SUNRISE_MIN + SUNSET_MIN) / 2;

/* ------------------------------------------------------------------ */
/* Small math helpers                                                  */
/* ------------------------------------------------------------------ */

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap = (m: number) => ((m % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(knots: number[], x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const a = knots[i % knots.length];
  const b = knots[(i + 1) % knots.length];
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

/** Smooth pseudo-random wobble in [-1, 1] used for live telemetry noise. */
export function wobble(t: number, seed: number) {
  return (
    0.5 * Math.sin(t * 0.83 + seed) +
    0.3 * Math.sin(t * 2.17 + seed * 1.9) +
    0.2 * Math.sin(t * 4.73 + seed * 2.3)
  );
}

export function sampleArray(arr: ArrayLike<number>, minute: number) {
  const m = wrap(minute);
  const i = Math.floor(m);
  const f = m - i;
  return lerp(arr[i], arr[(i + 1) % DAY_MINUTES], f);
}

/** Cumulative arrays have DAY_MINUTES + 1 entries. */
export function sampleCum(arr: ArrayLike<number>, minute: number) {
  const m = clamp(minute, 0, DAY_MINUTES);
  const i = Math.min(DAY_MINUTES - 1, Math.floor(m));
  const f = m - i;
  return lerp(arr[i], arr[i + 1], f);
}

/* ------------------------------------------------------------------ */
/* Sun & weather                                                       */
/* ------------------------------------------------------------------ */

export function sunFraction(minute: number) {
  const m = wrap(minute);
  if (m <= SUNRISE_MIN || m >= SUNSET_MIN) return 0;
  return Math.sin((Math.PI * (m - SUNRISE_MIN)) / (SUNSET_MIN - SUNRISE_MIN));
}

/** Clear-sky global horizontal irradiance in W/m². */
export function clearSkyGhi(minute: number) {
  return 905 * Math.pow(sunFraction(minute), 1.12);
}

/** Ambient temperature in °C (cooler under cloud). */
export function ambientTemp(minute: number, transmittance = 1) {
  return (
    19.5 +
    6.5 * Math.cos((2 * Math.PI * (wrap(minute) - 900)) / DAY_MINUTES) -
    1.8 * (1 - transmittance)
  );
}

export const CLOUD_EVENTS = [
  { center: 9 * 60 + 20, width: 14, depth: 0.38 },
  { center: 11 * 60 + 45, width: 22, depth: 0.55 },
  { center: 14 * 60 + 15, width: 38, depth: 0.62 },
  { center: 16 * 60 + 35, width: 18, depth: 0.3 },
] as const;

function buildTransmittance() {
  const rnd = mulberry32(2026);
  const knots = Array.from({ length: Math.ceil(DAY_MINUTES / 7) + 2 }, () =>
    rnd(),
  );
  const out = new Float32Array(DAY_MINUTES);
  for (let m = 0; m < DAY_MINUTES; m++) {
    let cloud = 0;
    for (const e of CLOUD_EVENTS) {
      const z = (m - e.center) / e.width;
      cloud += e.depth * Math.exp(-z * z);
    }
    const patch = clamp(cloud, 0, 1);
    const flicker = (valueNoise(knots, m / 7) - 0.5) * (0.05 + 0.22 * patch);
    out[m] = clamp(0.97 - patch + flicker, 0.1, 1);
  }
  return out;
}

function movingAverage(arr: Float32Array, half: number) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = -half; k <= half; k++) {
      sum += arr[wrap(i + k)];
      n++;
    }
    out[i] = sum / n;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* PV model                                                            */
/* ------------------------------------------------------------------ */

function orientationFactor(profile: PvProfile, x: number) {
  const ax = Math.abs(x);
  switch (profile) {
    case "south":
      return 1.04 + 0.22 * Math.pow(ax, 1.4);
    case "southeast":
      return 1.04 - 0.26 * x + 0.12 * Math.pow(ax, 1.4);
    case "southwest":
      return 1.04 + 0.26 * x + 0.12 * Math.pow(ax, 1.4);
    case "eastwest":
      return 0.86 + 0.5 * Math.pow(ax, 1.3);
    case "tracker":
      return 1.12 + 0.6 * Math.pow(ax, 1.2);
  }
}

function planeOfArray(cfg: PvSystemConfig, minute: number, trans: number) {
  const g = clearSkyGhi(minute);
  if (g <= 0) return 0;
  const half = (SUNSET_MIN - SUNRISE_MIN) / 2;
  const x = clamp((minute - SOLAR_NOON_MIN) / half, -1, 1);
  const f = orientationFactor(cfg.profile, x);
  const cloudExponent = cfg.profile === "tracker" ? 1.1 : 1;
  return g * f * Math.pow(trans, cloudExponent);
}

function moduleTemp(ambientC: number, poa: number) {
  return ambientC + 0.031 * poa;
}

function acPower(cfg: PvSystemConfig, poa: number, ambientC: number) {
  if (poa < 12) return 0;
  // Each module technology loses power at its own rate as the cells heat up.
  const temp = 1 - (Math.abs(cfg.technology.tempCoeffPct) / 100) * (moduleTemp(ambientC, poa) - 25);
  const dc = cfg.kWp * (poa / 1000) * cfg.efficiency * temp * cfg.derate;
  return Math.min(dc, cfg.acLimitKw * cfg.derate);
}

export function inverterEfficiency(loadFraction: number) {
  return 0.986 - 0.075 * Math.exp(-clamp(loadFraction, 0, 1.2) * 16);
}

/* ------------------------------------------------------------------ */
/* Load & dispatch                                                     */
/* ------------------------------------------------------------------ */

function buildLoad() {
  const rnd = mulberry32(99);
  const knots = Array.from({ length: Math.ceil(DAY_MINUTES / 5) + 2 }, () =>
    rnd(),
  );
  const out = new Float32Array(DAY_MINUTES);
  for (let m = 0; m < DAY_MINUTES; m++) {
    const day =
      smoothstep(6.5 * 60, 9 * 60, m) * (1 - smoothstep(17 * 60, 19.5 * 60, m));
    const lunchDip = 0.08 * Math.exp(-Math.pow((m - 13 * 60) / 50, 2));
    const evening = 70 * Math.exp(-Math.pow((m - 20.2 * 60) / 95, 2));
    const base = 295 + 380 * day * (1 - lunchDip) + evening;
    out[m] = base * (1 + (valueNoise(knots, m / 5) - 0.5) * 0.07);
  }
  return out;
}

export type BatteryMode = "charging" | "discharging" | "idle";
export type GridMode = "importing" | "exporting" | "idle";

export interface EnergyFlows {
  pv: number;
  load: number;
  pvToLoad: number;
  pvToBattery: number;
  pvToGrid: number;
  batteryToLoad: number;
  gridToLoad: number;
  gridToBattery: number;
  /** Positive = discharging, negative = charging. */
  batteryNet: number;
  /** Positive = importing, negative = exporting. */
  gridNet: number;
  soc: number;
  batteryMode: BatteryMode;
  gridMode: GridMode;
}

const isOffPeak = (minute: number) => minute >= 22 * 60 || minute < 6 * 60;

export function dispatch(
  pv: number,
  load: number,
  soc: number,
  minute: number,
): EnergyFlows {
  const net = pv - load;
  let charge = 0;
  let discharge = 0;
  let gridCharge = 0;

  if (net > 0) {
    const taper = clamp((BATTERY.socMax - soc) / 0.06, 0, 1);
    charge = Math.min(net, BATTERY.maxChargeKw * taper);
  } else if (net < 0) {
    const taper = clamp((soc - BATTERY.socMin) / 0.05, 0, 1);
    discharge = Math.min(-net, BATTERY.maxDischargeKw * taper);
  }

  // Off-peak strategy: hold the battery and top it up from the grid.
  if (isOffPeak(minute) && pv < 5) {
    discharge = 0;
    charge = 0;
    gridCharge = soc < 0.35 ? 280 * clamp((0.35 - soc) / 0.02, 0, 1) : 0;
  }

  const pvToLoad = Math.min(pv, load);
  const pvToBattery = charge;
  const pvToGrid = Math.max(0, pv - pvToLoad - pvToBattery);
  const batteryToLoad = discharge;
  const gridToLoad = Math.max(0, load - pvToLoad - batteryToLoad);
  const gridToBattery = gridCharge;

  const batteryNet = batteryToLoad - pvToBattery - gridToBattery;
  const gridNet = gridToLoad + gridToBattery - pvToGrid;

  return {
    pv,
    load,
    pvToLoad,
    pvToBattery,
    pvToGrid,
    batteryToLoad,
    gridToLoad,
    gridToBattery,
    batteryNet,
    gridNet,
    soc,
    batteryMode:
      batteryNet < -15 ? "charging" : batteryNet > 15 ? "discharging" : "idle",
    gridMode: gridNet > 15 ? "importing" : gridNet < -15 ? "exporting" : "idle",
  };
}

/* ------------------------------------------------------------------ */
/* Day model                                                           */
/* ------------------------------------------------------------------ */

export interface SystemDay {
  power: Float32Array;
  forecast: Float32Array;
  clearSky: Float32Array;
  poa: Float32Array;
  moduleTemp: Float32Array;
  /** kWh, DAY_MINUTES + 1 entries. */
  cumEnergy: Float32Array;
  cumForecast: Float32Array;
  /** kWh/m², DAY_MINUTES + 1 entries. */
  cumPoa: Float32Array;
}

const CUM_KEYS = [
  "pv",
  "load",
  "pvToLoad",
  "pvToBattery",
  "pvToGrid",
  "batteryToLoad",
  "gridToLoad",
  "gridToBattery",
] as const;
type CumKey = (typeof CUM_KEYS)[number];

export interface DayModel {
  transmittance: Float32Array;
  transmittanceForecast: Float32Array;
  ghi: Float32Array;
  ghiForecast: Float32Array;
  ambient: Float32Array;
  systems: SystemDay[];
  pv: Float32Array;
  pvForecast: Float32Array;
  pvClearSky: Float32Array;
  load: Float32Array;
  loadForecast: Float32Array;
  soc: Float32Array;
  batteryNet: Float32Array;
  gridNet: Float32Array;
  cum: Record<CumKey, Float32Array>;
  cumFleetForecast: Float32Array;
}

function cumulative(values: ArrayLike<number>, scale: number) {
  const out = new Float32Array(DAY_MINUTES + 1);
  for (let i = 0; i < DAY_MINUTES; i++) out[i + 1] = out[i] + values[i] * scale;
  return out;
}

let cachedModel: DayModel | null = null;

export function getDayModel(): DayModel {
  if (cachedModel) return cachedModel;

  const transmittance = buildTransmittance();
  const transmittanceForecast = movingAverage(transmittance, 70).map((v) =>
    clamp(v + 0.015, 0.1, 1),
  );

  const ambient = new Float32Array(DAY_MINUTES);
  const ghi = new Float32Array(DAY_MINUTES);
  const ghiForecast = new Float32Array(DAY_MINUTES);
  for (let m = 0; m < DAY_MINUTES; m++) {
    ambient[m] = ambientTemp(m, transmittance[m]);
    ghi[m] = clearSkyGhi(m) * transmittance[m];
    ghiForecast[m] = clearSkyGhi(m) * transmittanceForecast[m];
  }

  const pv = new Float32Array(DAY_MINUTES);
  const pvForecast = new Float32Array(DAY_MINUTES);
  const pvClearSky = new Float32Array(DAY_MINUTES);

  const systems: SystemDay[] = PV_SYSTEMS.map((cfg) => {
    const power = new Float32Array(DAY_MINUTES);
    const forecast = new Float32Array(DAY_MINUTES);
    const clearSky = new Float32Array(DAY_MINUTES);
    const poaArr = new Float32Array(DAY_MINUTES);
    const tempArr = new Float32Array(DAY_MINUTES);
    for (let m = 0; m < DAY_MINUTES; m++) {
      const tr = transmittance[wrap(Math.round(m - cfg.cloudDelayMin))];
      const poa = planeOfArray(cfg, m, tr);
      poaArr[m] = poa;
      tempArr[m] = moduleTemp(ambient[m], poa);
      power[m] = acPower(cfg, poa, ambient[m]);
      forecast[m] = acPower(
        cfg,
        planeOfArray(cfg, m, transmittanceForecast[m]),
        ambientTemp(m, transmittanceForecast[m]),
      );
      clearSky[m] = acPower(
        cfg,
        planeOfArray(cfg, m, 1),
        ambientTemp(m, 1),
      );
      pv[m] += power[m];
      pvForecast[m] += forecast[m];
      pvClearSky[m] += clearSky[m];
    }
    return {
      power,
      forecast,
      clearSky,
      poa: poaArr,
      moduleTemp: tempArr,
      cumEnergy: cumulative(power, 1 / 60),
      cumForecast: cumulative(forecast, 1 / 60),
      cumPoa: cumulative(poaArr, 1 / 60 / 1000),
    };
  });

  const load = buildLoad();
  const loadForecast = movingAverage(load, 20);

  // Run the battery logic twice so the state of charge is cyclic.
  const soc = new Float32Array(DAY_MINUTES);
  const batteryNet = new Float32Array(DAY_MINUTES);
  const gridNet = new Float32Array(DAY_MINUTES);
  const series: Record<CumKey, Float32Array> = Object.fromEntries(
    CUM_KEYS.map((k) => [k, new Float32Array(DAY_MINUTES)]),
  ) as Record<CumKey, Float32Array>;

  let state = 0.35;
  for (let pass = 0; pass < 2; pass++) {
    for (let m = 0; m < DAY_MINUTES; m++) {
      soc[m] = state;
      const f = dispatch(pv[m], load[m], state, m);
      batteryNet[m] = f.batteryNet;
      gridNet[m] = f.gridNet;
      for (const k of CUM_KEYS) series[k][m] = f[k];
      const dSoc =
        ((f.pvToBattery + f.gridToBattery) * BATTERY.efficiency -
          f.batteryToLoad / BATTERY.efficiency) /
        60 /
        BATTERY.capacityKwh;
      state = clamp(state + dSoc, 0, 1);
    }
  }

  const cum = Object.fromEntries(
    CUM_KEYS.map((k) => [k, cumulative(series[k], 1 / 60)]),
  ) as Record<CumKey, Float32Array>;

  cachedModel = {
    transmittance,
    transmittanceForecast,
    ghi,
    ghiForecast,
    ambient,
    systems,
    pv,
    pvForecast,
    pvClearSky,
    load,
    loadForecast,
    soc,
    batteryNet,
    gridNet,
    cum,
    cumFleetForecast: cumulative(pvForecast, 1 / 60),
  };
  return cachedModel;
}

/* ------------------------------------------------------------------ */
/* Snapshot (what the UI consumes)                                     */
/* ------------------------------------------------------------------ */

export interface SystemSnapshot {
  id: string;
  powerKw: number;
  clearSkyKw: number;
  poa: number;
  moduleTempC: number;
  todayKwh: number;
  projectedKwh: number;
  specificYield: number;
  pr: number;
  capacityFactor: number;
  efficiency: number;
  inverterEfficiency: number;
  utilisation: number;
  last30DaysMwh: number;
  lifetimeMwh: number;
}

export interface Snapshot {
  minute: number;
  ghi: number;
  ambientC: number;
  transmittance: number;
  daylight: number;
  flows: EnergyFlows;
  fleet: {
    powerKw: number;
    todayKwh: number;
    projectedKwh: number;
    specificYield: number;
    pr: number;
    capacityFactor: number;
    last30DaysMwh: number;
    lifetimeMwh: number;
    availability: number;
    co2AvoidedKg: number;
    peakKwToday: number;
  };
  today: {
    pvKwh: number;
    loadKwh: number;
    pvToLoadKwh: number;
    pvToBatteryKwh: number;
    gridToLoadKwh: number;
    gridImportKwh: number;
    gridExportKwh: number;
    batteryChargedKwh: number;
    batteryDischargedKwh: number;
    selfSufficiency: number;
    selfConsumption: number;
    peakLoadKw: number;
  };
  systems: SystemSnapshot[];
}

export function getSnapshot(minute: number, noiseSeconds: number): Snapshot {
  const model = getDayModel();
  const m = wrap(minute);

  const ghi = sampleArray(model.ghi, m);
  const ambientC = sampleArray(model.ambient, m);
  const transmittance = sampleArray(model.transmittance, m);

  /* PV systems */
  let fleetPower = 0;
  let fleetToday = 0;
  let fleetProjected = 0;
  let fleetPoaWeighted = 0;
  let availabilityWeighted = 0;

  const systems: SystemSnapshot[] = PV_SYSTEMS.map((cfg, idx) => {
    const day = model.systems[idx];
    const noise = 1 + 0.012 * wobble(noiseSeconds, idx * 3.1 + 1);
    const base = sampleArray(day.power, m);
    const powerKw = Math.min(base * noise, cfg.acLimitKw * cfg.derate);
    const poa = sampleArray(day.poa, m) * (1 + 0.006 * wobble(noiseSeconds, idx));
    const todayKwh = sampleCum(day.cumEnergy, m);
    const hPoa = sampleCum(day.cumPoa, m);
    const projected =
      todayKwh + (day.cumForecast[DAY_MINUTES] - sampleCum(day.cumForecast, m));
    const tempC = sampleArray(day.moduleTemp, m);
    const prNow = hPoa > 0.25 ? todayKwh / (cfg.kWp * hPoa) : cfg.efficiency * 0.93;
    const util = powerKw / cfg.acLimitKw;
    const efficiency =
      poa > 15
        ? (powerKw * 1000) / (poa * (cfg.kWp / cfg.technology.efficiency))
        : cfg.efficiency * cfg.technology.efficiency * 0.95;

    fleetPower += powerKw;
    fleetToday += todayKwh;
    fleetProjected += projected;
    fleetPoaWeighted += hPoa * cfg.kWp;
    availabilityWeighted += cfg.availability * cfg.kWp;

    return {
      id: cfg.id,
      powerKw,
      clearSkyKw: sampleArray(day.clearSky, m),
      poa,
      moduleTempC: tempC,
      todayKwh,
      projectedKwh: projected,
      specificYield: todayKwh / cfg.kWp,
      pr: prNow,
      capacityFactor: todayKwh / (cfg.kWp * 24),
      efficiency,
      inverterEfficiency: inverterEfficiency(util),
      utilisation: util,
      last30DaysMwh: cfg.last29DaysMwh + todayKwh / 1000,
      lifetimeMwh: cfg.lifetimeMwh + todayKwh / 1000,
    };
  });

  /* Flows */
  const pv = fleetPower;
  const loadNoise = 1 + 0.015 * wobble(noiseSeconds, 7.7);
  const load = sampleArray(model.load, m) * loadNoise;
  const soc = sampleArray(model.soc, m);
  const flows = dispatch(pv, load, soc, m);

  /* Today's accumulators */
  const c = (k: CumKey) => sampleCum(model.cum[k], m);
  const pvKwh = c("pv");
  const loadKwh = c("load");
  const gridImportKwh = c("gridToLoad") + c("gridToBattery");
  const gridExportKwh = c("pvToGrid");
  const batteryChargedKwh = c("pvToBattery") + c("gridToBattery");
  const batteryDischargedKwh = c("batteryToLoad");

  let peakPv = 0;
  let peakLoad = 0;
  const end = Math.floor(m);
  for (let i = 0; i <= end; i++) {
    if (model.pv[i] > peakPv) peakPv = model.pv[i];
    if (model.load[i] > peakLoad) peakLoad = model.load[i];
  }

  const fleetH = fleetPoaWeighted / TOTAL_KWP;

  return {
    minute: m,
    ghi,
    ambientC,
    transmittance,
    daylight: sunFraction(m),
    flows,
    fleet: {
      powerKw: pv,
      todayKwh: fleetToday,
      projectedKwh: fleetProjected,
      specificYield: fleetToday / TOTAL_KWP,
      pr: fleetH > 0.25 ? fleetToday / (TOTAL_KWP * fleetH) : 0.84,
      capacityFactor: fleetToday / (TOTAL_KWP * 24),
      last30DaysMwh: PV_SYSTEMS.reduce((s, p) => s + p.last29DaysMwh, 0) + fleetToday / 1000,
      lifetimeMwh: PV_SYSTEMS.reduce((s, p) => s + p.lifetimeMwh, 0) + fleetToday / 1000,
      availability: availabilityWeighted / TOTAL_KWP,
      co2AvoidedKg: fleetToday * SITE.gridEmissionFactor,
      peakKwToday: peakPv,
    },
    today: {
      pvKwh,
      loadKwh,
      pvToLoadKwh: c("pvToLoad"),
      pvToBatteryKwh: c("pvToBattery"),
      gridToLoadKwh: c("gridToLoad"),
      gridImportKwh,
      gridExportKwh,
      batteryChargedKwh,
      batteryDischargedKwh,
      selfSufficiency:
        loadKwh > 1 ? clamp(1 - c("gridToLoad") / loadKwh, 0, 1) : 0,
      selfConsumption:
        pvKwh > 1 ? clamp(1 - gridExportKwh / pvKwh, 0, 1) : 0,
      peakLoadKw: peakLoad,
    },
    systems,
  };
}

/* ------------------------------------------------------------------ */
/* Event log                                                           */
/* ------------------------------------------------------------------ */

export interface EnergyEvent {
  minute: number;
  kind: "info" | "success" | "warning";
  title: string;
  detail: string;
}

let cachedEvents: EnergyEvent[] | null = null;

export function getEvents(): EnergyEvent[] {
  if (cachedEvents) return cachedEvents;
  const model = getDayModel();
  const events: EnergyEvent[] = [
    {
      minute: 6 * 60 + 12,
      kind: "warning",
      title: "PV System 6 · Inverter 2 offline",
      detail: "System limited to 50 % capacity (1 of 2 inverters). Maintenance ticket #4821 opened.",
    },
    {
      minute: 8 * 60 + 40,
      kind: "warning",
      title: "PV System 4 · soiling index high",
      detail: "Performance ratio is 8 % below the fleet average. Cleaning advised.",
    },
  ];

  const first = (pred: (m: number) => boolean, from = 0) => {
    for (let m = from; m < DAY_MINUTES; m++) if (pred(m)) return m;
    return -1;
  };

  const start = first((m) => model.pv[m] > 10);
  if (start >= 0)
    events.push({
      minute: start,
      kind: "success",
      title: "Solar production started",
      detail: "Fleet output crossed 10 kW as the sun rose over the site.",
    });

  const full = first((m) => model.soc[m] >= 0.9, 600);
  if (full >= 0)
    events.push({
      minute: full,
      kind: "success",
      title: "Battery bank above 90 %",
      detail: "Charge rate is tapering — surplus solar now flows to the grid.",
    });

  const exportStart = first(
    (m) => model.gridNet[m] < -40 && model.pv[m] > model.load[m],
    600,
  );
  if (exportStart >= 0)
    events.push({
      minute: exportStart,
      kind: "info",
      title: "Exporting surplus to the grid",
      detail: `Feeding ${Math.abs(model.gridNet[exportStart]).toFixed(0)} kW into the 22 kV network.`,
    });

  let peakMin = 0;
  for (let m = 0; m < DAY_MINUTES; m++) if (model.pv[m] > model.pv[peakMin]) peakMin = m;
  events.push({
    minute: peakMin,
    kind: "success",
    title: "Daily production peak",
    detail: `Fleet reached ${model.pv[peakMin].toFixed(0)} kW.`,
  });

  for (const cloud of CLOUD_EVENTS) {
    if (cloud.depth < 0.4) continue;
    const m = cloud.center;
    events.push({
      minute: m,
      kind: "info",
      title: "Cloud passage detected",
      detail: `Irradiance dropped ${(cloud.depth * 100).toFixed(0)} % — battery stepped in to hold the load.`,
    });
  }

  const evening = first((m) => m > 16 * 60 && model.batteryNet[m] > 30);
  if (evening >= 0)
    events.push({
      minute: evening,
      kind: "info",
      title: "Battery discharging",
      detail: "Stored solar energy now covers the evening campus demand.",
    });

  const offpeak = first((m) => m >= 22 * 60 && model.batteryNet[m] < -50);
  if (offpeak >= 0)
    events.push({
      minute: offpeak,
      kind: "info",
      title: "Off-peak battery top-up",
      detail: "Battery charging from the grid at the night tariff.",
    });

  cachedEvents = events.sort((a, b) => a.minute - b.minute);
  return cachedEvents;
}

/* ------------------------------------------------------------------ */
/* Series helpers for charts                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_START_MINUTE = 12 * 60 + 52;

export function fleetEffectiveKw() {
  return PV_SYSTEMS.reduce((s, p) => s + p.kWp * p.efficiency * p.derate, 0);
}
