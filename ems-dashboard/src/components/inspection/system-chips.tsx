"use client";

import { PV_SYSTEMS } from "@/lib/pv-systems";
import { getInspection } from "@/lib/inspection";
import { cn } from "@/lib/cn";
import { SEVERITY_COLOR } from "./levels";

export function SystemChips({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return (
    <section aria-label="PV systems" className="enter" style={{ animationDelay: "90ms" }}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[15px] font-semibold text-ink-900">PV systems</h2>
        <p className="hidden text-[12.5px] text-ink-400 sm:block">Pick a system to see its strings and the modules with anomalies</p>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {PV_SYSTEMS.map((p, i) => {
          const { anomalies } = getInspection(i);
          const worst = anomalies[0];
          const critical = anomalies.filter((a) => a.severity === "critical").length;
          const on = i === selected;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(i)}
              className={cn(
                "group flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-left transition-all duration-200",
                on
                  ? "border-brand-300 bg-white shadow-accent-card ring-2 ring-brand-100"
                  : "border-line bg-white/80 hover:-translate-y-px hover:border-brand-200 hover:bg-white",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-[11px] font-bold text-white",
                  on && "bg-gradient-to-br from-brand-500 to-brand-800",
                )}
                style={on ? undefined : { background: p.color }}
              >
                {i + 1}
              </span>
              <span className="leading-tight">
                <span className={cn("block text-[13px] font-semibold", on ? "text-ink-900" : "text-ink-700")}>
                  {p.short}
                  <span className="ml-1.5 text-[11.5px] font-medium text-ink-400">{p.technology.short}</span>
                </span>
                <span
                  className="flex items-center gap-1.5 text-[11.5px] font-semibold"
                  style={{ color: worst ? SEVERITY_COLOR[worst.severity] : "#10b981" }}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"}
                  {critical > 0 && <span className="font-bold">· {critical} critical</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
