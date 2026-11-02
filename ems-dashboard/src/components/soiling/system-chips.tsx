"use client";

import { PV_SYSTEMS } from "@/lib/pv-systems";
import type { SystemSoiling } from "@/lib/soiling";
import { cn } from "@/lib/cn";
import { levelColor, pct } from "./levels";

export function SystemChips({
  systems,
  selected,
  onSelect,
}: {
  systems: SystemSoiling[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <section aria-label="PV systems" className="enter" style={{ animationDelay: "60ms" }}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[15px] font-semibold text-ink-900">PV systems</h2>
        <p className="hidden text-[12.5px] text-ink-400 sm:block">Pick a system to see its strings and modules</p>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {PV_SYSTEMS.map((p, i) => {
          const s = systems[i];
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
                className="grid size-8 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: on ? "linear-gradient(135deg,#d9b27a,#9c6a3a)" : p.color }}
              >
                {i + 1}
              </span>
              <span className="leading-tight">
                <span className={cn("block text-[13px] font-semibold", on ? "text-ink-900" : "text-ink-700")}>
                  {p.short}
                  <span className="ml-1.5 text-[11.5px] font-medium text-ink-400">{p.technology.short}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: levelColor(s.loss) }}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {pct(s.loss)}
                  {s.needsCleaning && <span className="font-bold uppercase tracking-wide">· clean</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
