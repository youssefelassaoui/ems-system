const pad = (n: number) => String(n).padStart(2, "0");

export function formatClock(minute: number, withSeconds = false) {
  const total = ((minute % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = Math.floor(total % 60);
  if (!withSeconds) return `${pad(h)}:${pad(m)}`;
  const s = Math.floor((total * 60) % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export interface Quantity {
  value: string;
  unit: string;
}

export function formatPower(kw: number): Quantity {
  const a = Math.abs(kw);
  if (a >= 1000) return { value: (kw / 1000).toFixed(2), unit: "MW" };
  if (a >= 100) return { value: kw.toFixed(0), unit: "kW" };
  return { value: kw.toFixed(1), unit: "kW" };
}

export function formatEnergy(kwh: number): Quantity {
  const a = Math.abs(kwh);
  if (a >= 1_000_000) return { value: (kwh / 1_000_000).toFixed(2), unit: "GWh" };
  if (a >= 1000) return { value: (kwh / 1000).toFixed(2), unit: "MWh" };
  return { value: kwh.toFixed(a >= 100 ? 0 : 1), unit: "kWh" };
}

export function formatMwh(mwh: number): Quantity {
  if (Math.abs(mwh) >= 1000) return { value: (mwh / 1000).toFixed(2), unit: "GWh" };
  return { value: mwh.toFixed(mwh >= 100 ? 0 : 1), unit: "MWh" };
}

export const joinQuantity = (q: Quantity) => `${q.value} ${q.unit}`;

export const percent = (fraction: number, digits = 0) =>
  `${(fraction * 100).toFixed(digits)}%`;

export const int = (n: number) => Math.round(n).toLocaleString("en-US");
