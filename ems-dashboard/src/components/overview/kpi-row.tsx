"use client";

import { BatteryCharging, Building2, PlugZap, Sun } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { BATTERY } from "@/lib/site";
import { formatEnergy, joinQuantity, formatPower } from "@/lib/format";
import {
  pickGrid,
  pickLoad,
  pickPv,
  pickSoc,
  useDaySeries,
} from "@/hooks/use-day-series";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";

export function KpiRow() {
  const { snapshot } = useLive();
  const { flows, fleet, today } = snapshot;

  const pvSeries = useDaySeries(pickPv);
  const loadSeries = useDaySeries(pickLoad);
  const socSeries = useDaySeries(pickSoc);
  const gridSeries = useDaySeries(pickGrid);

  const battPower = joinQuantity(formatPower(Math.abs(flows.batteryNet)));
  const batteryStatus =
    flows.batteryMode === "charging"
      ? `Charging · ${battPower}`
      : flows.batteryMode === "discharging"
        ? `Discharging · ${battPower}`
        : "Standby";
  const gridStatus =
    flows.gridMode === "exporting" ? "Exporting" : flows.gridMode === "importing" ? "Importing" : "Balanced";

  return (
    <KpiGrid>
      <KpiTile
        href="/production"
        delay={40}
        icon={<Sun />}
        label="Solar"
        value={<AnimatedQuantity value={fleet.powerKw} kind="power" unitClassName={KPI_UNIT} />}
        sub={
          <>
            Today <span className="font-semibold text-ink-800">{joinQuantity(formatEnergy(fleet.todayKwh))}</span>
          </>
        }
        series={pvSeries}
      />

      <KpiTile
        delay={90}
        icon={<Building2 />}
        label="Consumption"
        value={<AnimatedQuantity value={flows.load} kind="power" unitClassName={KPI_UNIT} />}
        sub={
          <>
            Today <span className="font-semibold text-ink-800">{joinQuantity(formatEnergy(today.loadKwh))}</span>
          </>
        }
        series={loadSeries}
      />

      <KpiTile
        href="/battery"
        delay={140}
        icon={<BatteryCharging />}
        label="Battery"
        value={
          <>
            <AnimatedNumber value={flows.soc * 100} decimals={0} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={<span className="font-semibold text-ink-700">{batteryStatus}</span>}
        series={socSeries}
        min={BATTERY.socMin - 0.05}
        max={BATTERY.socMax + 0.05}
      />

      <KpiTile
        href="/grid"
        delay={190}
        icon={<PlugZap />}
        label="Grid"
        value={<AnimatedQuantity value={Math.abs(flows.gridNet)} kind="power" unitClassName={KPI_UNIT} />}
        sub={<span className="font-semibold text-ink-700">{gridStatus}</span>}
        series={gridSeries}
      />
    </KpiGrid>
  );
}
