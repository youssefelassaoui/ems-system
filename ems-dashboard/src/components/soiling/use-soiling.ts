"use client";

import { useMemo } from "react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS, TOTAL_KWP } from "@/lib/pv-systems";
import { HISTORY_DAYS, fleetSoilingHistory, getSystemSoiling } from "@/lib/soiling";

/** Lost energy for a given production and soiling loss: what the clean module would have added. */
export const lostKwh = (producedKwh: number, loss: number) => (producedKwh * loss) / (1 - loss);

/** Live soiling of every system, plus fleet aggregates. Recomputed once per simulated minute. */
export function useSoiling() {
  const { minute, snapshot } = useLive();
  const m = Math.floor(minute);

  const base = useMemo(() => {
    const systems = PV_SYSTEMS.map((_, i) => getSystemSoiling(i, m));
    const fleetHistory = fleetSoilingHistory(m);
    const fleetLoss = fleetHistory[fleetHistory.length - 1];
    // Energy lost over the window, from each system's typical daily yield.
    const windowLostKwh = PV_SYSTEMS.reduce((sum, p, i) => {
      const daily = (p.last29DaysMwh * 1000) / 29;
      return sum + systems[i].history.slice(0, -1).reduce((s, l) => s + lostKwh(daily, l), 0);
    }, 0);
    return { systems, fleetHistory, fleetLoss, windowLostKwh };
  }, [m]);

  const lostToday = PV_SYSTEMS.map((_, i) => lostKwh(snapshot.systems[i].todayKwh, base.systems[i].loss));
  const lostTodayKwh = lostToday.reduce((s, v) => s + v, 0);
  const lostNowKw = PV_SYSTEMS.reduce(
    (s, _, i) => s + lostKwh(snapshot.systems[i].powerKw, base.systems[i].loss),
    0,
  );

  return { ...base, lostToday, lostTodayKwh, lostNowKw, days: HISTORY_DAYS, totalKwp: TOTAL_KWP };
}
