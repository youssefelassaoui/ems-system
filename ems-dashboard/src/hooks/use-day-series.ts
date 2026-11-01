"use client";

import { useMemo } from "react";
import { getDayModel, type DayModel } from "@/lib/simulation";
import { useLive } from "@/providers/live-provider";

/**
 * Samples a day-model array from midnight up to the current simulated time.
 * Re-computed only when the clock crosses a `step`-minute boundary.
 */
export function useDaySeries(
  pick: (model: DayModel) => ArrayLike<number>,
  step = 10,
) {
  const { minute } = useLive();
  const count = Math.max(2, Math.floor(minute / step) + 1);

  return useMemo(() => {
    const arr = pick(getDayModel());
    return Array.from({ length: count }, (_, i) => arr[Math.min(i * step, 1439)]);
  }, [count, pick, step]);
}

export const pickPv = (m: DayModel) => m.pv;
export const pickLoad = (m: DayModel) => m.load;
export const pickGrid = (m: DayModel) => m.gridNet;
export const pickSoc = (m: DayModel) => m.soc;
export const pickBattery = (m: DayModel) => m.batteryNet;
/** Cumulative fleet production since midnight, in kWh. */
export const pickPvCum = (m: DayModel) => m.cum.pv;
