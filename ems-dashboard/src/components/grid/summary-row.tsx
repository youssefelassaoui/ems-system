"use client";

import { ArrowDownToLine, ArrowUpFromLine, PlugZap, Waves } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { GRID } from "@/lib/site";
import { wobble } from "@/lib/simulation";
import { formatEnergy, joinQuantity, percent } from "@/lib/format";
import { pickGrid, useDaySeries } from "@/hooks/use-day-series";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";

const MODE_LABEL = { importing: "Importing", exporting: "Exporting", idle: "Balanced" } as const;

export function GridSummary() {
  const { snapshot, noiseSeconds } = useLive();
  const { flows, today } = snapshot;

  const gridSeries = useDaySeries(pickGrid);

  const net = Math.abs(flows.gridNet);
  const fromGridShare = today.loadKwh > 1 ? today.gridToLoadKwh / today.loadKwh : 0;
  const storageTopUp = Math.max(0, today.gridImportKwh - today.gridToLoadKwh);
  const exportShare = today.pvKwh > 1 ? today.gridExportKwh / today.pvKwh : 0;

  // Live power-quality readings: tiny, smooth excursions around the nominal values.
  const voltage = GRID.voltageKv * (1 + 0.0035 * wobble(noiseSeconds * 0.35, 3));
  const frequency = 50 + 0.045 * wobble(noiseSeconds * 0.5, 11);
  const powerFactor = Math.min(1, 0.985 + 0.009 * wobble(noiseSeconds * 0.3, 5));

  return (
    <KpiGrid>
      <KpiTile
        energy="grid"
        delay={40}
        icon={<PlugZap />}
        label="Net exchange"
        value={<AnimatedQuantity value={net} kind="power" unitClassName={KPI_UNIT} />}
        sub={<span className="font-semibold text-ink-700">{MODE_LABEL[flows.gridMode]}</span>}
        series={gridSeries}
      />

      <KpiTile
        energy="grid"
        delay={90}
        icon={<ArrowDownToLine />}
        label="Imported today"
        value={<AnimatedQuantity value={today.gridImportKwh} kind="energy" unitClassName={KPI_UNIT} />}
        sub={
          <>
            <span className="font-semibold text-ink-800">{percent(fromGridShare)}</span> of demand ·{" "}
            {joinQuantity(formatEnergy(storageTopUp))} to storage
          </>
        }
      />

      <KpiTile
        energy="grid"
        delay={140}
        icon={<ArrowUpFromLine />}
        label="Exported today"
        value={<AnimatedQuantity value={today.gridExportKwh} kind="energy" unitClassName={KPI_UNIT} />}
        sub={
          <>
            <span className="font-semibold text-ink-800">{percent(exportShare)}</span> of solar production
          </>
        }
      />

      <KpiTile
        energy="grid"
        delay={190}
        icon={<Waves />}
        label="Power quality"
        value={
          <>
            <AnimatedNumber value={voltage} decimals={2} />
            <span className={KPI_UNIT}>kV</span>
          </>
        }
        sub={
          <>
            <AnimatedNumber value={frequency} decimals={2} /> Hz · PF{" "}
            <AnimatedNumber value={powerFactor} decimals={3} />
          </>
        }
      />
    </KpiGrid>
  );
}
