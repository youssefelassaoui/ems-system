"use client";

import { BatteryCharging, Boxes, Fan, Thermometer } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { BATTERY } from "@/lib/site";
import { BATTERY_UNIT_HEALTH, BATTERY_UNIT_SOC_OFFSETS } from "@/lib/assets";
import { formatEnergy, formatPower, joinQuantity } from "@/lib/format";
import { clamp } from "@/lib/simulation";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { RadialGauge } from "@/components/ui/radial-gauge";

const SHARE = [0.335, 0.33, 0.335] as const;

export function UnitCards({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const { flows, ambientC } = snapshot;

  return (
    <section aria-labelledby="units-heading" className={className}>
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id="units-heading" className="font-display text-[18px] font-semibold text-ink-900">
            Storage units
          </h2>
          <p className="text-[13px] text-ink-400">
            {BATTERY.units} containers · {BATTERY.unitCapacityKwh} kWh each · liquid-assisted air cooling
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {BATTERY_UNIT_HEALTH.map((unit, u) => {
          const soc = clamp(flows.soc + BATTERY_UNIT_SOC_OFFSETS[u], 0, 1);
          const power = flows.batteryNet * SHARE[u];
          const temp = ambientC * 0.55 + 15 + unit.tempBias + (6 * Math.abs(power)) / (BATTERY.maxDischargeKw / 3);
          const stored = soc * BATTERY.unitCapacityKwh;
          const mode = power < -5 ? "Charging" : power > 5 ? "Discharging" : "Standby";

          return (
            <Card key={unit.name} className="enter" style={{ animationDelay: `${120 + u * 70}ms` }}>
              <CardHeader
                title={`Battery ${unit.name.toLowerCase()}`}
                subtitle={`${BATTERY.unitCapacityKwh} kWh · ${BATTERY.chemistry}`}
                icon={<Boxes className="size-5" />}
                action={
                  <Badge tone={mode === "Standby" ? "neutral" : "brand"} dot>
                    {mode}
                  </Badge>
                }
              />

              <div className="flex items-center gap-5">
                <RadialGauge value={soc} size={108} stroke={10}>
                  <div className="font-display text-[22px] font-bold leading-none text-ink-900">
                    <AnimatedNumber value={soc * 100} decimals={0} />
                    <span className="text-[0.55em] font-semibold text-ink-400">%</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">SOC</p>
                </RadialGauge>

                <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
                  <Stat label="Stored" value={joinQuantity(formatEnergy(stored))} />
                  <Stat label="Power" value={joinQuantity(formatPower(Math.abs(power)))} />
                  <Stat label="Cell temp." value={`${temp.toFixed(1)} °C`} icon={<Thermometer className="size-3.5" />} />
                  <Stat label="Health" value={`${unit.sohPct.toFixed(1)} %`} icon={<BatteryCharging className="size-3.5" />} />
                </dl>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[12px] text-ink-500">
                <span>
                  <span className="num font-semibold text-ink-800">{unit.cycles}</span> cycles
                </span>
                <span className="flex items-center gap-1.5">
                  <Fan className="size-3.5 text-brand-500" />
                  Cooling {temp > 30 ? "boost" : "nominal"}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
        {icon}
        {label}
      </dt>
      <dd className="num mt-0.5 font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
