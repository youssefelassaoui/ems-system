"use client";

import { Gauge, Layers, Sun, Zap } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { TOTAL_KWP, PV_SYSTEMS } from "@/lib/pv-systems";
import { formatEnergy, formatMwh, joinQuantity, percent } from "@/lib/format";
import { pickPv, pickPvCum, useDaySeries } from "@/hooks/use-day-series";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";

export function SummaryRow() {
  const { snapshot } = useLive();
  const { fleet } = snapshot;

  const powerSeries = useDaySeries(pickPv);
  const energySeries = useDaySeries(pickPvCum);

  const online = PV_SYSTEMS.filter((p) => p.status === "online").length;

  return (
    <KpiGrid>
      <KpiTile
        delay={40}
        icon={<Zap />}
        label="Output"
        value={<AnimatedQuantity value={fleet.powerKw} kind="power" unitClassName={KPI_UNIT} />}
        sub={
          <>
            <span className="font-semibold text-ink-800">{percent(fleet.powerKw / TOTAL_KWP)}</span> of{" "}
            {(TOTAL_KWP / 1000).toFixed(2)} MWp
          </>
        }
        series={powerSeries}
      />

      <KpiTile
        delay={90}
        icon={<Sun />}
        label="Produced today"
        value={<AnimatedQuantity value={fleet.todayKwh} kind="energy" unitClassName={KPI_UNIT} />}
        sub={
          <>
            Projected{" "}
            <span className="font-semibold text-ink-800">{joinQuantity(formatEnergy(fleet.projectedKwh))}</span>
          </>
        }
        series={energySeries}
      />

      <KpiTile
        delay={140}
        icon={<Gauge />}
        label="Performance"
        value={
          <>
            <AnimatedNumber value={fleet.pr * 100} decimals={1} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={
          <>
            <span className="font-semibold text-ink-800">{fleet.specificYield.toFixed(2)}</span> kWh/kWp ·{" "}
            <span className="font-semibold text-ink-800">
              {online}/{PV_SYSTEMS.length}
            </span>{" "}
            online
          </>
        }
      />

      <KpiTile
        delay={190}
        icon={<Layers />}
        label="Last 30 days"
        value={<AnimatedQuantity value={fleet.last30DaysMwh} kind="mwh" unitClassName={KPI_UNIT} />}
        sub={
          <>
            Lifetime{" "}
            <span className="font-semibold text-ink-800">{joinQuantity(formatMwh(fleet.lifetimeMwh))}</span> ·{" "}
            {fleet.availability.toFixed(1)}% available
          </>
        }
      />
    </KpiGrid>
  );
}
