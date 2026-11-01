"use client";

import { Activity, BatteryCharging, Repeat2, ShieldCheck } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { BATTERY } from "@/lib/site";
import { BATTERY_ROUND_TRIP, BATTERY_UNIT_HEALTH, BATTERY_USABLE_KWH } from "@/lib/assets";
import { formatEnergy, joinQuantity } from "@/lib/format";
import { pickBattery, pickSoc, useDaySeries } from "@/hooks/use-day-series";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";

const MODE_LABEL = { charging: "Charging", discharging: "Discharging", idle: "Standby" } as const;
const FLOW_LABEL = { charging: "Into storage", discharging: "To campus", idle: "Idle" } as const;

/** Average state of health across the three containers. */
const SOH = BATTERY_UNIT_HEALTH.reduce((s, u) => s + u.sohPct, 0) / BATTERY_UNIT_HEALTH.length;
const CYCLES = Math.round(BATTERY_UNIT_HEALTH.reduce((s, u) => s + u.cycles, 0) / BATTERY_UNIT_HEALTH.length);

export function BatterySummary() {
  const { snapshot } = useLive();
  const { flows, today } = snapshot;

  const socSeries = useDaySeries(pickSoc);
  const powerSeries = useDaySeries(pickBattery);

  const stored = flows.soc * BATTERY.capacityKwh;
  const power = Math.abs(flows.batteryNet);
  const cyclesToday = today.batteryDischargedKwh / BATTERY_USABLE_KWH;

  return (
    <KpiGrid>
      <KpiTile
        energy="battery"
        delay={40}
        icon={<BatteryCharging />}
        label="State of charge"
        value={
          <>
            <AnimatedNumber value={flows.soc * 100} decimals={1} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={
          <>
            <span className="font-semibold text-ink-700">{MODE_LABEL[flows.batteryMode]}</span> ·{" "}
            {joinQuantity(formatEnergy(stored))}
          </>
        }
        series={socSeries}
        min={BATTERY.socMin - 0.05}
        max={BATTERY.socMax + 0.05}
      />

      <KpiTile
        energy="battery"
        delay={90}
        icon={<Activity />}
        label="Power exchange"
        value={<AnimatedQuantity value={power} kind="power" unitClassName={KPI_UNIT} />}
        sub={<span className="font-semibold text-ink-700">{FLOW_LABEL[flows.batteryMode]}</span>}
        series={powerSeries}
      />

      <KpiTile
        energy="battery"
        delay={140}
        icon={<Repeat2 />}
        label="Charged today"
        value={<AnimatedQuantity value={today.batteryChargedKwh} kind="energy" unitClassName={KPI_UNIT} />}
        sub={
          <>
            Discharged{" "}
            <span className="font-semibold text-ink-800">
              {joinQuantity(formatEnergy(today.batteryDischargedKwh))}
            </span>{" "}
            · {cyclesToday.toFixed(2)} cycles
          </>
        }
      />

      <KpiTile
        energy="battery"
        delay={190}
        icon={<ShieldCheck />}
        label="State of health"
        value={
          <>
            <AnimatedNumber value={SOH} decimals={1} />
            <span className={KPI_UNIT}>%</span>
          </>
        }
        sub={
          <>
            <span className="font-semibold text-ink-800">{CYCLES}</span> cycles ·{" "}
            {(BATTERY_ROUND_TRIP * 100).toFixed(0)} % round trip
          </>
        }
      />
    </KpiGrid>
  );
}
