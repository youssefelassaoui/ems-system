/**
 * Static site configuration.
 * Edit these values to adapt the platform to a real installation.
 */
export const SITE = {
  name: "Chaire Energy Campus",
  shortName: "Logo",
  location: "Benguerir, Morocco",
  latitude: 32.23,
  longitude: -7.94,
  timezoneLabel: "UTC+1",
  /** Grid emission factor in kg CO₂ per kWh. */
  gridEmissionFactor: 0.65,
} as const;

export const BATTERY = {
  units: 3,
  unitCapacityKwh: 800,
  capacityKwh: 2400,
  maxChargeKw: 1000,
  maxDischargeKw: 1000,
  socMin: 0.12,
  socMax: 0.96,
  /** Charge / discharge efficiency (one way). */
  efficiency: 0.97,
  chemistry: "LFP",
} as const;

export const GRID = {
  connectionKva: 2000,
  voltageKv: 22,
} as const;
