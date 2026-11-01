"use client";

import { PieChart } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { formatEnergy, joinQuantity, percent } from "@/lib/format";
import { ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { Donut } from "@/components/ui/donut";

export function EnergyMix({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const t = snapshot.today;

  const sources = [
    { label: "Solar (direct)", value: t.pvToLoadKwh, color: ENERGY.solar.main },
    { label: "Battery", value: t.batteryDischargedKwh, color: ENERGY.battery.main },
    { label: "Grid", value: t.gridToLoadKwh, color: ENERGY.grid.main },
  ];
  const total = sources.reduce((s, x) => s + x.value, 0) || 1;
  const consumed = formatEnergy(t.loadKwh);

  return (
    <Card className={className}>
      <CardHeader
        title="Where the energy comes from"
        subtitle="Campus consumption today, by source"
        icon={<PieChart className="size-5" />}
      />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center xl:flex-col">
        <Donut segments={sources} size={188} stroke={20}>
          <p className="font-display text-[26px] font-bold leading-none text-ink-900">
            {consumed.value}
            <span className="ml-1 text-[13px] font-semibold text-ink-400">{consumed.unit}</span>
          </p>
          <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Consumed
          </p>
        </Donut>

        <ul className="w-full max-w-xs space-y-3">
          {sources.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2.5 font-semibold text-ink-700">
                <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="num flex items-baseline gap-2">
                <span className="font-bold text-ink-900">{joinQuantity(formatEnergy(s.value))}</span>
                <span className="w-10 text-right text-[12px] font-semibold text-ink-400">
                  {percent(s.value / total)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
