"use client";

import Link from "next/link";
import { ArrowUpRight, SunMedium } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { formatEnergy, joinQuantity, percent } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { AnimatedQuantity } from "@/components/ui/animated-number";

export function FleetGlance({ className }: { className?: string }) {
  const { snapshot } = useLive();

  return (
    <Card className={className}>
      <CardHeader
        title="PV fleet at a glance"
        subtitle="Live output of every photovoltaic system"
        icon={<SunMedium className="size-5" />}
        action={
          <Link
            href="/production"
            className="group inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-2 text-[12.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 transition hover:bg-brand-600 hover:text-white"
          >
            Details
            <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[13px]">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              <th className="pb-3 pr-4 font-semibold">System</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 pr-6 font-semibold">Load</th>
              <th className="pb-3 pr-4 text-right font-semibold">Power</th>
              <th className="pb-3 pr-4 text-right font-semibold">Today</th>
              <th className="pb-3 text-right font-semibold">PR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {PV_SYSTEMS.map((cfg, i) => {
              const s = snapshot.systems[i];
              return (
                <tr key={cfg.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="size-2.5 rounded-full" style={{ background: cfg.color }} />
                      <div>
                        <p className="font-semibold text-ink-900">{cfg.name}</p>
                        <p className="text-[11.5px] text-ink-400">
                          {cfg.kWp} kWp · {cfg.technology.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={cfg.status} />
                  </td>
                  <td className="py-3 pr-6">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600 transition-[width] duration-1000"
                          style={{ width: `${Math.min(100, s.utilisation * 100)}%` }}
                        />
                      </div>
                      <span className="num w-9 text-[12px] font-semibold text-ink-500">
                        {percent(s.utilisation)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <AnimatedQuantity
                      value={s.powerKw}
                      kind="power"
                      className="num font-bold text-ink-900"
                      unitClassName="ml-1 text-[11px] font-semibold text-ink-400"
                    />
                  </td>
                  <td className="num py-3 pr-4 text-right font-semibold text-ink-700">
                    {joinQuantity(formatEnergy(s.todayKwh))}
                  </td>
                  <td className="num py-3 text-right font-semibold text-ink-700">
                    {percent(s.pr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
