"use client";

import { CalendarClock } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { CLEAN_THRESHOLD, type SystemSoiling } from "@/lib/soiling";
import { formatEnergy, joinQuantity } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { levelColor, pct } from "./levels";

function nextCleaning(s: SystemSoiling) {
  if (s.needsCleaning) return { label: "Clean now", tone: "warning" as const };
  const days = Math.ceil((CLEAN_THRESHOLD - s.loss) / s.ratePerDay);
  return days <= 7
    ? { label: `In ~${days} days`, tone: "brand" as const }
    : { label: `In ~${days} days`, tone: "success" as const };
}

export function CleaningPlan({
  systems,
  lostToday,
  selected,
  onSelect,
}: {
  systems: SystemSoiling[];
  lostToday: number[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Cleaning plan"
        subtitle={`Systems reach the threshold at ${(CLEAN_THRESHOLD * 100).toFixed(0)} % soiling loss (without rain)`}
        icon={<CalendarClock className="size-5" />}
      />
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              <th className="py-2.5 pr-4 font-semibold">System</th>
              <th className="py-2.5 pr-4 font-semibold">Technology</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Soiling</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Lost today</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Rate</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Last cleaned</th>
              <th className="py-2.5 text-right font-semibold">Next cleaning</th>
            </tr>
          </thead>
          <tbody>
            {PV_SYSTEMS.map((p, i) => {
              const s = systems[i];
              const next = nextCleaning(s);
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(i)}
                  className={cn(
                    "cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-brand-50/50",
                    i === selected && "bg-brand-50/70",
                  )}
                >
                  <td className="py-3 pr-4 font-semibold text-ink-900">
                    <span className="flex items-center gap-2.5">
                      <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                      {p.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-ink-600">{p.technology.name}</td>
                  <td className="py-3 pr-4 text-right font-semibold tabular-nums" style={{ color: levelColor(s.loss) }}>
                    {pct(s.loss, 2)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-700">
                    {joinQuantity(formatEnergy(lostToday[i]))}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-600">
                    {(s.ratePerDay * 100).toFixed(2)} %/d
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink-600">{s.cleanedDaysAgo} days ago</td>
                  <td className="py-3 text-right">
                    <Badge tone={next.tone} dot>
                      {next.label}
                    </Badge>
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
