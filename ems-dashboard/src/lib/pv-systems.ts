export type PvStatus = "online" | "warning" | "maintenance";

/** Orientation / tracking profile — drives the shape of the daily curve. */
export type PvProfile =
  | "south"
  | "southeast"
  | "southwest"
  | "eastwest"
  | "tracker";

/** A photovoltaic module technology. */
export interface ModuleTechnology {
  /** Full commercial name. */
  name: string;
  /** Compact label for chips and tables. */
  short: string;
  /** Cell description. */
  cell: string;
  bifacial: boolean;
  /** Module efficiency under STC (0–1). */
  efficiency: number;
  /** Power temperature coefficient in %/°C (negative: output drops as modules heat up). */
  tempCoeffPct: number;
}

export const TECHNOLOGIES = {
  perc: {
    name: "Mono PERC",
    short: "PERC",
    cell: "Monocrystalline · p-type · half-cut",
    bifacial: false,
    efficiency: 0.21,
    tempCoeffPct: -0.35,
  },
  poly: {
    name: "Polycrystalline",
    short: "Poly-Si",
    cell: "Polycrystalline silicon · 72 cells",
    bifacial: false,
    efficiency: 0.165,
    tempCoeffPct: -0.4,
  },
  topcon: {
    name: "Bifacial TOPCon",
    short: "TOPCon",
    cell: "Monocrystalline · n-type · glass–glass",
    bifacial: true,
    efficiency: 0.223,
    tempCoeffPct: -0.3,
  },
  cdte: {
    name: "Thin-film CdTe",
    short: "CdTe",
    cell: "Cadmium telluride · thin film",
    bifacial: false,
    efficiency: 0.19,
    tempCoeffPct: -0.28,
  },
  hjt: {
    name: "Heterojunction (HJT)",
    short: "HJT",
    cell: "Monocrystalline · n-type · a-Si passivation",
    bifacial: true,
    efficiency: 0.22,
    tempCoeffPct: -0.26,
  },
  bifacialPerc: {
    name: "Bifacial PERC",
    short: "Bi-PERC",
    cell: "Monocrystalline · p-type · glass–glass",
    bifacial: true,
    efficiency: 0.216,
    tempCoeffPct: -0.34,
  },
} as const satisfies Record<string, ModuleTechnology>;

export interface InverterBank {
  count: number;
  /** AC rating of one inverter, in kW. */
  ratedKw: number;
  kind: "String" | "Central";
}

export interface PvSystemConfig {
  id: string;
  name: string;
  /** Short label used in dense charts. */
  short: string;
  technology: ModuleTechnology;
  /** Rated power of one module (STC), in Wp. */
  moduleWp: number;
  /** Number of parallel strings. */
  stringCount: number;
  /** Modules connected in series in each string. */
  modulesPerString: number;
  inverters: InverterBank;
  /** Total number of modules (strings × modules per string). */
  modules: number;
  /** DC capacity in kWp (modules × module power). */
  kWp: number;
  /** Inverter AC limit in kW (inverters × rating). */
  acLimitKw: number;
  /** DC / AC ratio. */
  dcAcRatio: number;
  profile: PvProfile;
  /** Tracking and orientation, e.g. "Fixed 15° · South". */
  orientation: string;
  commissioned: string;
  status: PvStatus;
  statusNote?: string;
  /** System losses excluding temperature (soiling, mismatch, cabling, inverter). */
  efficiency: number;
  /** Share of capacity currently available (1 = full). */
  derate: number;
  availability: number;
  /** Minutes by which the cloud field reaches this array (relative to the site). */
  cloudDelayMin: number;
  /** Energy produced during the previous 29 days, in MWh (rolling 30-day window = this + today). */
  last29DaysMwh: number;
  /** Energy produced since commissioning before today, in MWh. */
  lifetimeMwh: number;
  /** Chart colour (warm solar family, alternating light and dark so stacked areas stay readable). */
  color: string;
}

type SystemInput = Omit<PvSystemConfig, "modules" | "kWp" | "acLimitKw" | "dcAcRatio">;

/** Capacity figures are derived from the equipment so the sheet is always self-consistent. */
function system(input: SystemInput): PvSystemConfig {
  const modules = input.stringCount * input.modulesPerString;
  const kWp = (modules * input.moduleWp) / 1000;
  const acLimitKw = input.inverters.count * input.inverters.ratedKw;
  return { ...input, modules, kWp, acLimitKw, dcAcRatio: kWp / acLimitKw };
}

export const PV_SYSTEMS: readonly PvSystemConfig[] = [
  system({
    id: "pv-1",
    name: "PV System 1",
    short: "PV 1",
    technology: TECHNOLOGIES.perc,
    moduleWp: 500,
    stringCount: 32,
    modulesPerString: 30,
    inverters: { count: 4, ratedKw: 100, kind: "String" },
    profile: "south",
    orientation: "Fixed 15° · South",
    commissioned: "2021",
    status: "online",
    efficiency: 0.9,
    derate: 1,
    availability: 99.8,
    cloudDelayMin: 0,
    last29DaysMwh: 61.4,
    lifetimeMwh: 1284,
    color: "#F59E0B",
  }),
  system({
    id: "pv-2",
    name: "PV System 2",
    short: "PV 2",
    technology: TECHNOLOGIES.poly,
    moduleWp: 320,
    stringCount: 40,
    modulesPerString: 25,
    inverters: { count: 4, ratedKw: 70, kind: "String" },
    profile: "southwest",
    orientation: "Fixed 10° · South-West",
    commissioned: "2022",
    status: "online",
    efficiency: 0.89,
    derate: 1,
    availability: 99.6,
    cloudDelayMin: 4,
    last29DaysMwh: 40.2,
    lifetimeMwh: 702,
    color: "#EA580C",
  }),
  system({
    id: "pv-3",
    name: "PV System 3",
    short: "PV 3",
    technology: TECHNOLOGIES.topcon,
    moduleWp: 600,
    stringCount: 50,
    modulesPerString: 25,
    inverters: { count: 5, ratedKw: 125, kind: "String" },
    profile: "tracker",
    orientation: "Single-axis tracker · N–S axis",
    commissioned: "2022",
    status: "online",
    efficiency: 0.91,
    derate: 1,
    availability: 99.9,
    cloudDelayMin: -3,
    last29DaysMwh: 118.7,
    lifetimeMwh: 2310,
    color: "#FACC15",
  }),
  system({
    id: "pv-4",
    name: "PV System 4",
    short: "PV 4",
    technology: TECHNOLOGIES.cdte,
    moduleWp: 500,
    stringCount: 70,
    modulesPerString: 6,
    inverters: { count: 2, ratedKw: 90, kind: "String" },
    profile: "eastwest",
    orientation: "Fixed 10° · East / West",
    commissioned: "2020",
    status: "warning",
    statusNote: "Soiling detected — cleaning recommended",
    efficiency: 0.8,
    derate: 1,
    availability: 99.1,
    cloudDelayMin: 7,
    last29DaysMwh: 24.1,
    lifetimeMwh: 861,
    color: "#B45309",
  }),
  system({
    id: "pv-5",
    name: "PV System 5",
    short: "PV 5",
    technology: TECHNOLOGIES.hjt,
    moduleWp: 400,
    stringCount: 20,
    modulesPerString: 20,
    inverters: { count: 2, ratedKw: 70, kind: "String" },
    profile: "south",
    orientation: "Fixed 25° · South",
    commissioned: "2023",
    status: "online",
    efficiency: 0.89,
    derate: 1,
    availability: 99.7,
    cloudDelayMin: 10,
    last29DaysMwh: 20.3,
    lifetimeMwh: 322,
    color: "#FB923C",
  }),
  system({
    id: "pv-6",
    name: "PV System 6",
    short: "PV 6",
    technology: TECHNOLOGIES.bifacialPerc,
    moduleWp: 560,
    stringCount: 20,
    modulesPerString: 25,
    inverters: { count: 2, ratedKw: 120, kind: "String" },
    profile: "southeast",
    orientation: "Fixed 8° · South-East",
    commissioned: "2023",
    status: "maintenance",
    statusNote: "Inverter 2 offline — running at 50 % capacity",
    efficiency: 0.9,
    derate: 0.5,
    availability: 94.2,
    cloudDelayMin: -6,
    last29DaysMwh: 24.8,
    lifetimeMwh: 366,
    color: "#CA8A04",
  }),
];

export const TOTAL_KWP = PV_SYSTEMS.reduce((s, p) => s + p.kWp, 0);
export const TOTAL_AC_KW = PV_SYSTEMS.reduce((s, p) => s + p.acLimitKw, 0);
export const TOTAL_MODULES = PV_SYSTEMS.reduce((s, p) => s + p.modules, 0);
export const TOTAL_STRINGS = PV_SYSTEMS.reduce((s, p) => s + p.stringCount, 0);
export const TOTAL_INVERTERS = PV_SYSTEMS.reduce((s, p) => s + p.inverters.count, 0);

/** Capacity-weighted temperature coefficient of the fleet, as a positive fraction per °C. */
export const FLEET_TEMP_COEFF =
  PV_SYSTEMS.reduce((s, p) => s + p.kWp * Math.abs(p.technology.tempCoeffPct), 0) / TOTAL_KWP / 100;

/** Distinct module technologies in the fleet, largest capacity first. */
export const FLEET_TECHNOLOGIES = Object.values(
  PV_SYSTEMS.reduce<Record<string, { technology: ModuleTechnology; kWp: number; systems: number }>>(
    (acc, p) => {
      const key = p.technology.short;
      acc[key] ??= { technology: p.technology, kWp: 0, systems: 0 };
      acc[key].kWp += p.kWp;
      acc[key].systems += 1;
      return acc;
    },
    {},
  ),
).sort((a, b) => b.kWp - a.kWp);

export const PV_BY_ID: Record<string, PvSystemConfig> = Object.fromEntries(
  PV_SYSTEMS.map((p) => [p.id, p]),
);

/** Whether a "Bifacial" tag adds information (some technology names already say it). */
export function needsBifacialTag(tech: ModuleTechnology) {
  return tech.bifacial && !/bifacial/i.test(tech.name);
}

/** "4 × 100 kW" */
export function formatInverters(bank: InverterBank) {
  return `${bank.count} × ${bank.ratedKw} kW`;
}
