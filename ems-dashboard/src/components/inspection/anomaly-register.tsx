"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { moduleLabel, type ModuleRef } from "@/lib/soiling";
import { ANOMALY_KINDS, SEVERITY_LABEL, getInspection, type Severity } from "@/lib/inspection";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { ANOMALY_ICON, SEVERITIES, SEVERITY_COLOR, formatDelta, formatLoss, formatTemp } from "./levels";

export function AnomalyRegister({
  index,
  selected,
  onSelect,
}: {
  index: number;
  selected: ModuleRef;
  onSelect: (ref: ModuleRef) => void;
}) {
  const cfg = PV_SYSTEMS[index];
  const { anomalies } = getInspection(index);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const rows = filter === "all" ? anomalies : anomalies.filter((a) => a.severity === filter);
  const totalLoss = anomalies.reduce((s, a) => s + a.lossWp, 0);

  return (
    <Card>
      <CardHeader
        title="Anomaly register"
        subtitle={`${cfg.name} · ${anomalies.length} anomalies · ${(totalLoss / 1000).toFixed(2)} kWp at risk`}
        icon={<ListChecks className="size-5" />}
      />

      <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by severity">
        {(["all", ...SEVERITIES] as const).map((s) => {
          const n = s === "all" ? anomalies.length : anomalies.filter((a) => a.severity === s).length;
          const on = filter === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition",
                on ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-600 hover:border-brand-200",
              )}
            >
              {s !== "all" && <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />}
              {s === "all" ? "All" : SEVERITY_LABEL[s]}
              <span className="text-ink-400">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="-mx-5 max-h-[460px] overflow-auto px-5 sm:-mx-6 sm:px-6">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              <th className="py-2.5 pr-4 font-semibold">ID</th>
              <th className="py-2.5 pr-4 font-semibold">Module</th>
              <th className="py-2.5 pr-4 font-semibold">Type</th>
              <th className="py-2.5 pr-4 font-semibold">Severity</th>
              <th className="py-2.5 pr-4 text-right font-semibold">ΔT</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Hotspot</th>
              <th className="py-2.5 pr-4 text-right font-semibold">Power loss</th>
              <th className="py-2.5 text-right font-semibold">Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const Icon = ANOMALY_ICON[a.type];
              const on =
                a.ref.inverter === selected.inverter && a.ref.string === selected.string && a.ref.module === selected.module;
              return (
                <tr
                  key={a.id}
                  onClick={() => {
                    onSelect(a.ref);
                    document.getElementById("inspection-viewer")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={cn(
                    "cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-brand-50/50",
                    on && "bg-brand-50/70",
                  )}
                >
                  <td className="py-2.5 pr-4 font-mono text-[12px] font-semibold text-ink-700">{a.id}</td>
                  <td className="py-2.5 pr-4 text-ink-600">{moduleLabel(a.ref)}</td>
                  <td className="py-2.5 pr-4 font-medium text-ink-800">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-ink-400" />
                      {ANOMALY_KINDS[a.type].short}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: SEVERITY_COLOR[a.severity] }}>
                      <span className="size-2 rounded-full bg-current" />
                      {SEVERITY_LABEL[a.severity]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-ink-800">{formatDelta(a.deltaT)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink-600">{formatTemp(a.maxTempC)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink-700">
                    {formatLoss(a.loss)} · {a.lossWp.toFixed(0)} W
                  </td>
                  <td className="py-2.5 text-right text-[12px] text-ink-500">{a.flights === 1 ? "New" : `${a.flights} flights`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
