import { BATTERY, GRID, SITE } from "./site";
import {
  FLEET_TECHNOLOGIES,
  PV_SYSTEMS,
  TOTAL_AC_KW,
  TOTAL_INVERTERS,
  TOTAL_KWP,
  TOTAL_MODULES,
  TOTAL_STRINGS,
} from "./pv-systems";

/**
 * Static descriptions of the three physical assets shown in the 3D digital twin.
 * They feed the hover cards in the scene and the "specifications" panels of the detail pages.
 */
export type AssetId = "pv" | "battery" | "grid";

export interface AssetSpec {
  label: string;
  value: string;
}

export interface AssetInfo {
  id: AssetId;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  /** Short blurb shown in the hover card. */
  summary: string;
  /** Three or four rows shown in the hover card. */
  highlights: AssetSpec[];
  /** Complete specification sheet (detail pages). */
  specs: AssetSpec[];
}

export const ASSET_IDS: readonly AssetId[] = ["pv", "battery", "grid"];

const inverterCount = TOTAL_INVERTERS;
const moduleCount = TOTAL_MODULES;
const stringCount = TOTAL_STRINGS;
const technologyNames = FLEET_TECHNOLOGIES.map((t) => t.technology.short).join(" · ");
const years = PV_SYSTEMS.map((p) => Number(p.commissioned)).filter(Number.isFinite);
const firstYear = Math.min(...years);
const lastYear = Math.max(...years);

const usableKwh = BATTERY.capacityKwh * (BATTERY.socMax - BATTERY.socMin);
const roundTrip = BATTERY.efficiency * BATTERY.efficiency;

export const BATTERY_USABLE_KWH = usableKwh;
export const BATTERY_ROUND_TRIP = roundTrip;

/** Small state-of-charge spread between the three containers (shared by the 3D scene and the page). */
export const BATTERY_UNIT_SOC_OFFSETS = [-0.02, 0, 0.025] as const;

/** Static per-unit health counters (a real BMS would stream these). */
export const BATTERY_UNIT_HEALTH = [
  { name: "Unit 1", sohPct: 97.9, cycles: 412, tempBias: 0 },
  { name: "Unit 2", sohPct: 97.6, cycles: 405, tempBias: 0.9 },
  { name: "Unit 3", sohPct: 97.4, cycles: 418, tempBias: -0.6 },
] as const;

export const ASSET_INFO: Record<AssetId, AssetInfo> = {
  pv: {
    id: "pv",
    title: "Solar PV fleet",
    subtitle: `${PV_SYSTEMS.length} systems · ${(TOTAL_KWP / 1000).toFixed(2)} MWp`,
    href: "/production",
    cta: "Open production",
    summary: `${PV_SYSTEMS.length} PV systems on ${FLEET_TECHNOLOGIES.length} module technologies feeding the campus micro-grid.`,
    highlights: [
      { label: "DC capacity", value: `${(TOTAL_KWP / 1000).toFixed(2)} MWp` },
      { label: "Modules", value: moduleCount.toLocaleString("en-US") },
      { label: "Strings", value: stringCount.toLocaleString("en-US") },
      { label: "Inverters", value: String(inverterCount) },
    ],
    specs: [
      { label: "PV systems", value: String(PV_SYSTEMS.length) },
      { label: "Module technologies", value: technologyNames },
      { label: "DC capacity", value: `${(TOTAL_KWP / 1000).toFixed(2)} MWp` },
      { label: "AC capacity", value: `${(TOTAL_AC_KW / 1000).toFixed(2)} MW` },
      { label: "PV modules", value: moduleCount.toLocaleString("en-US") },
      { label: "Strings", value: stringCount.toLocaleString("en-US") },
      { label: "Inverters", value: String(inverterCount) },
      { label: "Commissioned", value: `${firstYear} – ${lastYear}` },
    ],
  },
  battery: {
    id: "battery",
    title: "Battery storage",
    subtitle: `${BATTERY.units} units · ${(BATTERY.capacityKwh / 1000).toFixed(1)} MWh`,
    href: "/battery",
    cta: "Open storage",
    summary: "Containerised lithium-iron-phosphate bank that shifts solar energy into the evening.",
    highlights: [
      { label: "Capacity", value: `${(BATTERY.capacityKwh / 1000).toFixed(1)} MWh` },
      { label: "Power", value: `± ${(BATTERY.maxDischargeKw / 1000).toFixed(1)} MW` },
      { label: "Units", value: `${BATTERY.units} × ${BATTERY.unitCapacityKwh} kWh` },
      { label: "Round trip", value: `${(roundTrip * 100).toFixed(0)} %` },
    ],
    specs: [
      { label: "Chemistry", value: "Lithium iron phosphate (LFP)" },
      { label: "Units", value: `${BATTERY.units} × ${BATTERY.unitCapacityKwh} kWh` },
      { label: "Nominal capacity", value: `${(BATTERY.capacityKwh / 1000).toFixed(1)} MWh` },
      { label: "Usable window", value: `${(BATTERY.socMin * 100).toFixed(0)} – ${(BATTERY.socMax * 100).toFixed(0)} % SOC` },
      { label: "Usable energy", value: `${(usableKwh / 1000).toFixed(2)} MWh` },
      { label: "Max charge power", value: `${(BATTERY.maxChargeKw / 1000).toFixed(1)} MW` },
      { label: "Max discharge power", value: `${(BATTERY.maxDischargeKw / 1000).toFixed(1)} MW` },
      { label: "Round-trip efficiency", value: `${(roundTrip * 100).toFixed(0)} %` },
    ],
  },
  grid: {
    id: "grid",
    title: "Utility grid",
    subtitle: `${GRID.voltageKv} kV · ${GRID.connectionKva.toLocaleString("en-US")} kVA`,
    href: "/grid",
    cta: "Open grid",
    summary: "Bidirectional medium-voltage connection that imports the deficit and exports the surplus.",
    highlights: [
      { label: "Connection", value: `${GRID.connectionKva.toLocaleString("en-US")} kVA` },
      { label: "Voltage", value: `${GRID.voltageKv} kV (MV)` },
      { label: "Metering", value: "Bidirectional" },
      { label: "CO₂ factor", value: `${SITE.gridEmissionFactor} kg/kWh` },
    ],
    specs: [
      { label: "Connection capacity", value: `${GRID.connectionKva.toLocaleString("en-US")} kVA` },
      { label: "Voltage level", value: `${GRID.voltageKv} kV medium voltage` },
      { label: "Nominal frequency", value: "50 Hz" },
      { label: "Metering", value: "Bidirectional smart meter" },
      { label: "Export", value: "Allowed up to connection capacity" },
      { label: "Emission factor", value: `${SITE.gridEmissionFactor} kg CO₂ / kWh` },
    ],
  },
};

/** Illustrative tariff windows (the battery strategy tops up during the off-peak window). */
export const TARIFF_WINDOWS = [
  { id: "offpeak", label: "Off-peak", from: 22 * 60, to: 6 * 60, note: "Night tariff · battery top-up" },
  { id: "day", label: "Day", from: 6 * 60, to: 18 * 60, note: "Solar covers the campus" },
  { id: "peak", label: "Evening peak", from: 18 * 60, to: 22 * 60, note: "Battery discharges" },
] as const;
