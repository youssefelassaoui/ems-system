/**
 * Weather & PV production forecast model.
 *
 * Day 0 is derived from the live simulation day model (forecast vs. actual),
 * days 1-6 are synthetic but physically plausible outlooks. Swap
 * `getForecast` for a real provider (Open-Meteo, Solcast, Meteomatics…) to go
 * live — the UI only depends on the shapes exported here.
 */
import { FLEET_TEMP_COEFF, PV_SYSTEMS, TOTAL_AC_KW } from "./pv-systems";
import {
  DAY_MINUTES,
  SOLAR_NOON_MIN,
  SUNRISE_MIN,
  SUNSET_MIN,
  clamp,
  clearSkyGhi,
  getDayModel,
  mulberry32,
  sunFraction,
  wobble,
} from "./simulation";

export type Condition = "clear" | "partly" | "cloudy" | "overcast" | "rain";

export const CONDITION_LABEL: Record<Condition, string> = {
  clear: "Clear sky",
  partly: "Partly cloudy",
  cloudy: "Mostly cloudy",
  overcast: "Overcast",
  rain: "Rain showers",
};

export function conditionFromCloud(cloud: number, precip = 0): Condition {
  if (precip >= 60 && cloud >= 70) return "rain";
  if (cloud < 15) return "clear";
  if (cloud < 40) return "partly";
  if (cloud < 70) return "cloudy";
  return "overcast";
}

export interface HourlyPoint {
  hour: number;
  isDay: boolean;
  ghi: number;
  /** Observed GHI (day 0 only). */
  ghiActual?: number;
  temp: number;
  cloud: number;
  wind: number;
  humidity: number;
  precip: number;
  condition: Condition;
  /** Forecast PV production in kW. */
  pv: number;
  pvLow: number;
  pvHigh: number;
  /** Observed PV production (day 0 only). */
  pvActual?: number;
}

export interface DayForecast {
  index: number;
  condition: Condition;
  tMax: number;
  tMin: number;
  cloudAvg: number;
  precipProb: number;
  windMax: number;
  humidityAvg: number;
  uvMax: number;
  ghiTotal: number;
  pvEnergyKwh: number;
  pvPeakKw: number;
  pvPeakHour: number;
  confidence: "High" | "Medium" | "Low";
  hourly: HourlyPoint[];
}

interface DayProfile {
  clearness: number;
  tMax: number;
  tMin: number;
  wind: number;
  humidity: number;
  precip: number;
}

const OUTLOOK: DayProfile[] = [
  { clearness: 0.82, tMax: 26, tMin: 13, wind: 13, humidity: 42, precip: 6 },
  { clearness: 0.97, tMax: 27, tMin: 14, wind: 11, humidity: 36, precip: 2 },
  { clearness: 0.94, tMax: 28, tMin: 14, wind: 16, humidity: 34, precip: 3 },
  { clearness: 0.76, tMax: 26, tMin: 15, wind: 19, humidity: 46, precip: 15 },
  { clearness: 0.45, tMax: 22, tMin: 14, wind: 24, humidity: 68, precip: 55 },
  { clearness: 0.28, tMax: 19, tMin: 12, wind: 27, humidity: 82, precip: 85 },
  { clearness: 0.7, tMax: 22, tMin: 11, wind: 17, humidity: 54, precip: 20 },
];

/** Fleet-level conversion constants (consistent with the PV model). */
const FLEET_EFFECTIVE_KW = PV_SYSTEMS.reduce(
  (s, p) => s + p.kWp * p.efficiency * p.derate,
  0,
);
const FLEET_AC_KW = PV_SYSTEMS.reduce((s, p) => s + p.acLimitKw * p.derate, 0);
const ORIENTATION_GAIN = 1.05;

export function pvFromGhi(ghi: number, ambientC: number) {
  if (ghi < 12) return 0;
  const poa = ghi * ORIENTATION_GAIN;
  const temp = 1 - FLEET_TEMP_COEFF * (ambientC + 0.031 * poa - 25);
  return Math.min((FLEET_EFFECTIVE_KW * poa * temp) / 1000, FLEET_AC_KW);
}

function uncertainty(dayIndex: number, clearness: number) {
  return clamp(0.05 + 0.04 * dayIndex + 0.22 * (1 - clearness), 0.05, 0.5);
}

function hourAverage(arr: ArrayLike<number>, hour: number) {
  let s = 0;
  for (let i = 0; i < 60; i++) s += arr[hour * 60 + i];
  return s / 60;
}

let cachedForecast: DayForecast[] | null = null;

export function getForecast(): DayForecast[] {
  if (cachedForecast) return cachedForecast;
  const model = getDayModel();

  const days: DayForecast[] = OUTLOOK.map((profile, d) => {
    const rnd = mulberry32(500 + d * 17);
    const hourly: HourlyPoint[] = [];

    for (let h = 0; h < 24; h++) {
      const m = h * 60 + 30;
      const isDay = sunFraction(m) > 0;
      const mid = (profile.tMax + profile.tMin) / 2;
      const amp = (profile.tMax - profile.tMin) / 2;

      let ghi: number;
      let cloud: number;
      let temp: number;
      let ghiActual: number | undefined;
      let pvActual: number | undefined;
      let pv: number;

      if (d === 0) {
        ghi = hourAverage(model.ghiForecast, h);
        ghiActual = hourAverage(model.ghi, h);
        cloud = clamp((1 - hourAverage(model.transmittanceForecast, h)) * 100 * (isDay ? 1 : 0.45), 0, 100);
        temp = hourAverage(model.ambient, h);
        pv = hourAverage(model.pvForecast, h);
        pvActual = hourAverage(model.pv, h);
      } else {
        const noise = (rnd() - 0.5) * 0.2 * (1 - profile.clearness * 0.6);
        const trans = clamp(profile.clearness + noise, 0.08, 1);
        ghi = clearSkyGhi(m) * trans;
        cloud = clamp((1 - trans) * 105 + (rnd() - 0.5) * 8, 0, 100);
        temp = mid + amp * Math.cos((2 * Math.PI * (h - 15)) / 24) - 1.5 * (1 - trans);
        pv = pvFromGhi(ghi, temp);
      }

      const wind = Math.max(
        2,
        profile.wind * (0.72 + 0.4 * Math.sin((Math.PI * (h - 4)) / 18)) +
          (rnd() - 0.5) * 3,
      );
      const humidity = clamp(
        profile.humidity + 18 * Math.cos((2 * Math.PI * (h - 4)) / 24) + (rnd() - 0.5) * 4,
        12,
        98,
      );
      const precip = clamp(profile.precip * (0.65 + 0.7 * rnd()), 0, 100);
      const u = uncertainty(d, profile.clearness);

      hourly.push({
        hour: h,
        isDay,
        ghi,
        ghiActual,
        temp,
        cloud,
        wind,
        humidity,
        precip,
        condition: conditionFromCloud(cloud, precip),
        pv,
        pvLow: pv * (1 - u),
        pvHigh: Math.min(pv * (1 + u * 0.6), FLEET_AC_KW),
        pvActual,
      });
    }

    const daylight = hourly.filter((p) => p.isDay);
    const cloudAvg = daylight.reduce((s, p) => s + p.cloud, 0) / daylight.length;
    const precipProb = Math.max(...hourly.map((p) => p.precip));
    const peak = hourly.reduce((best, p) => (p.pv > best.pv ? p : best), hourly[0]);
    const noonTrans = d === 0 ? 0.85 : profile.clearness;

    return {
      index: d,
      condition: conditionFromCloud(cloudAvg, precipProb),
      tMax: Math.max(...hourly.map((p) => p.temp)),
      tMin: Math.min(...hourly.map((p) => p.temp)),
      cloudAvg,
      precipProb,
      windMax: Math.max(...hourly.map((p) => p.wind)),
      humidityAvg: hourly.reduce((s, p) => s + p.humidity, 0) / 24,
      uvMax: 7.4 * (0.55 + 0.45 * noonTrans),
      ghiTotal: hourly.reduce((s, p) => s + p.ghi, 0) / 1000,
      pvEnergyKwh: hourly.reduce((s, p) => s + p.pv, 0),
      pvPeakKw: peak.pv,
      pvPeakHour: peak.hour,
      confidence: d <= 1 ? "High" : d <= 3 ? "Medium" : "Low",
      hourly,
    };
  });

  cachedForecast = days;
  return days;
}

/* ------------------------------------------------------------------ */
/* Live conditions                                                     */
/* ------------------------------------------------------------------ */

export interface CurrentConditions {
  tempC: number;
  feelsLikeC: number;
  cloud: number;
  humidity: number;
  windKmh: number;
  windDir: string;
  pressure: number;
  uv: number;
  ghi: number;
  dni: number;
  dhi: number;
  visibilityKm: number;
  condition: Condition;
  isDay: boolean;
}

export function getCurrentConditions(
  minute: number,
  tempC: number,
  ghi: number,
  transmittance: number,
  noiseSeconds: number,
): CurrentConditions {
  const sun = sunFraction(minute);
  const cloud = clamp((1 - transmittance) * 100 * (sun > 0 ? 1.05 : 0.5), 0, 100);
  const dhi = Math.min(ghi, ghi * (0.12 + 0.85 * (1 - transmittance)));
  const dni = sun > 0.05 ? Math.max(0, (ghi - dhi) / Math.max(0.28, sun * 0.92)) : 0;
  const windKmh = Math.max(
    3,
    12 + 4 * Math.sin((Math.PI * (minute - 240)) / 1080) + 1.4 * wobble(noiseSeconds, 4.2),
  );
  const humidity = clamp(70 - 2.4 * (tempC - 13) + (1 - transmittance) * 14, 18, 96);
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dir = directions[Math.floor(((minute / 60) * 0.7 + 1.4) % 8)];

  return {
    tempC,
    feelsLikeC: tempC - windKmh * 0.04 + (humidity - 50) * 0.02,
    cloud,
    humidity,
    windKmh,
    windDir: dir,
    pressure: 1016 + 2.2 * Math.sin((minute / DAY_MINUTES) * 2 * Math.PI) + 0.25 * wobble(noiseSeconds, 9),
    uv: 7.4 * sun * (0.55 + 0.45 * transmittance),
    ghi,
    dni,
    dhi,
    visibilityKm: 24 - (cloud > 80 ? 6 : 0),
    condition: conditionFromCloud(cloud, 0),
    isDay: sun > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Forecast accuracy history                                           */
/* ------------------------------------------------------------------ */

export interface AccuracyPoint {
  /** Negative offset in days from today (-7 … -1). */
  offset: number;
  forecastKwh: number;
  actualKwh: number;
  errorPct: number;
}

export function getAccuracyHistory(): AccuracyPoint[] {
  const clearness = [0.88, 0.62, 0.95, 0.5, 0.78, 0.97, 0.84];
  const rnd = mulberry32(31337);
  let clearDay = 0;
  for (let h = 0; h < 24; h++) clearDay += pvFromGhi(clearSkyGhi(h * 60 + 30), 22);
  return clearness.map((c, i) => {
    const actual = clearDay * c * (0.97 + rnd() * 0.04);
    const forecast = actual * (1 + (rnd() - 0.5) * 0.16);
    return {
      offset: i - 7,
      forecastKwh: forecast,
      actualKwh: actual,
      errorPct: ((forecast - actual) / actual) * 100,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function formatDate(
  date: Date,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" },
) {
  return date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export const SUN_TIMES = {
  sunrise: SUNRISE_MIN,
  sunset: SUNSET_MIN,
  noon: SOLAR_NOON_MIN,
};

export { TOTAL_AC_KW };
