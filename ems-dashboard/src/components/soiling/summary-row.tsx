"use client";

import { AlertTriangle, SprayCan, TrendingDown, Wind } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { CLEAN_THRESHOLD } from "@/lib/soiling";
import { formatEnergy, joinQuantity } from "@/lib/format";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { useSoiling } from "./use-soiling";

export function SoilingSummary() {
  const s = useSoiling();
  const worst = s.systems.reduce((best, v, i) => (v.loss > s.systems[best].loss ? i : best), 0);
  const due = s.systems.filter((v) => v.needsCleaning).length;

  return (
    <KpiGrid>
      <KpiTile
        energy="dust"
        delay={40}
        icon={<Wind />}
        label="Fleet soiling"
        value={
          <>
            <AnimatedNumber value={s.fleetLoss * 100} decimals={2} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={
          <>
            Soiling ratio <span className="font-semibold text-ink-800">{(1 - s.fleetLoss).toFixed(3)}</span>
          </>
        }
        series={s.fleetHistory.map((v) => v * 100)}
        min={0}
      />

      <KpiTile
        energy="dust"
        delay={90}
        icon={<TrendingDown />}
        label="Lost today"
        value={<AnimatedQuantity value={s.lostTodayKwh} kind="energy" unitClassName={KPI_UNIT} />}
        sub={
          <>
            <span className="font-semibold text-ink-800">{joinQuantity(formatEnergy(s.windowLostKwh))}</span> over{" "}
            {s.days} days
          </>
        }
      />

      <KpiTile
        energy="dust"
        delay={140}
        icon={<AlertTriangle />}
        label="Most soiled"
        value={
          <>
            <AnimatedNumber value={s.systems[worst].loss * 100} decimals={1} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={
          <>
            <span className="font-semibold text-ink-800">{PV_SYSTEMS[worst].name}</span> ·{" "}
            {PV_SYSTEMS[worst].technology.short}
          </>
        }
      />

      <KpiTile
        energy="dust"
        delay={190}
        icon={<SprayCan />}
        label="Cleaning due"
        value={
          <>
            {due}
            <span className={KPI_UNIT}>of {PV_SYSTEMS.length}</span>
          </>
        }
        sub={<>Threshold {(CLEAN_THRESHOLD * 100).toFixed(0)} % soiling loss</>}
      />
    </KpiGrid>
  );
}
