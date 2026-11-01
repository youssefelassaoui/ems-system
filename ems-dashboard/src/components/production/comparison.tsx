"use client";

import { BarChart3 } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { percent } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";

const PR_TARGET = 0.8;

function Bar({
  value,
  max,
  color,
  marker,
}: {
  value: number;
  max: number;
  color: string;
  marker?: number;
}) {
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-ink-100">
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
      />
      {marker !== undefined && (
        <span
          className="absolute inset-y-0 w-0.5 bg-ink-900/70"
          style={{ left: `${(marker / max) * 100}%` }}
          title="Target"
        />
      )}
    </div>
  );
}

export function Comparison({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const rows = PV_SYSTEMS.map((cfg, i) => ({ cfg, s: snapshot.systems[i] }));
  const maxYield = Math.max(...rows.map((r) => r.s.specificYield), 0.1) * 1.08;
  const maxEnergy = Math.max(...rows.map((r) => r.s.todayKwh), 1) * 1.05;

  return (
    <Card className={className}>
      <CardHeader
        title="Performance comparison"
        subtitle="Performance ratio, specific yield and share of today’s production"
        icon={<BarChart3 className="size-5" />}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <th className="pb-3 font-semibold">System</th>
              <th className="pb-3 pr-6 font-semibold">Performance ratio</th>
              <th className="pb-3 pr-6 font-semibold">Specific yield</th>
              <th className="pb-3 pr-6 font-semibold">Energy today</th>
              <th className="pb-3 text-right font-semibold">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cfg, s }) => (
              <tr key={cfg.id} className="border-t border-line/80">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full" style={{ background: cfg.color }} />
                    <div>
                      <p className="font-semibold text-ink-900">{cfg.name}</p>
                      <p className="text-[11.5px] text-ink-400">{cfg.technology.name}</p>
                    </div>
                  </div>
                </td>
                <td className="w-[24%] py-3.5 pr-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar value={s.pr} max={1} color={cfg.color} marker={PR_TARGET} />
                    </div>
                    <span className="num w-12 text-right font-semibold text-ink-800">{percent(s.pr, 1)}</span>
                  </div>
                </td>
                <td className="w-[24%] py-3.5 pr-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar value={s.specificYield} max={maxYield} color={cfg.color} />
                    </div>
                    <span className="num w-14 text-right font-semibold text-ink-800">
                      {s.specificYield.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="w-[20%] py-3.5 pr-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Bar value={s.todayKwh} max={maxEnergy} color={cfg.color} />
                    </div>
                    <span className="num w-[76px] whitespace-nowrap text-right font-semibold text-ink-800">
                      {s.todayKwh >= 1000 ? `${(s.todayKwh / 1000).toFixed(2)} MWh` : `${Math.round(s.todayKwh)} kWh`}
                    </span>
                  </div>
                </td>
                <td className="num py-3.5 text-right font-semibold text-ink-800">
                  {percent(snapshot.fleet.todayKwh > 0 ? s.todayKwh / snapshot.fleet.todayKwh : 0, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-400">
        <span className="inline-block h-3 w-0.5 bg-ink-900/70" />
        Target performance ratio {percent(PR_TARGET)} · specific yield in kWh per kWp installed
      </p>
    </Card>
  );
}
