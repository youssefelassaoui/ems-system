"use client";

import { Cloud, Droplets } from "lucide-react";
import { CONDITION_LABEL, type DayForecast } from "@/lib/weather";
import { cn } from "@/lib/cn";
import { dayLabel } from "./day-label";
import { WeatherIcon } from "./weather-icon";

export function Outlook({
  days,
  selected,
  onSelect,
  dateISO,
}: {
  days: DayForecast[];
  selected: number;
  onSelect: (index: number) => void;
  dateISO: string;
}) {
  const maxEnergy = Math.max(...days.map((d) => d.pvEnergyKwh));

  return (
    <section aria-labelledby="outlook-heading">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id="outlook-heading" className="font-display text-[18px] font-semibold text-ink-900">
            7-day outlook
          </h2>
          <p className="text-[13px] text-ink-400">Weather and expected PV production · select a day for hourly detail</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const label = dayLabel(d.index, dateISO);
          const active = d.index === selected;
          const share = d.pvEnergyKwh / maxEnergy;
          return (
            <button
              key={d.index}
              type="button"
              onClick={() => onSelect(d.index)}
              aria-pressed={active}
              style={{ animationDelay: `${d.index * 50}ms` }}
              className={cn(
                "enter group relative overflow-hidden rounded-[24px] border p-4 text-left transition duration-300",
                active
                  ? "border-brand-700/40 bg-gradient-to-b from-brand-500 via-brand-600 to-brand-800 text-white shadow-glow"
                  : "border-line bg-white shadow-card hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-glow",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={cn("text-[13px] font-bold", active ? "text-white" : "text-ink-900")}>{label.short}</p>
                  <p className={cn("text-[11.5px]", active ? "text-white/70" : "text-ink-400")}>{label.date}</p>
                </div>
                <WeatherIcon condition={d.condition} tinted={!active} className={cn("size-7", active && "text-white")} />
              </div>

              <p className={cn("mt-3 truncate text-[12px] font-medium", active ? "text-white/85" : "text-ink-500")}>
                {CONDITION_LABEL[d.condition]}
              </p>

              <p className="font-display mt-2 flex items-baseline gap-1.5">
                <span className="text-[26px] font-bold leading-none tracking-tight">{d.tMax.toFixed(0)}°</span>
                <span className={cn("text-[14px] font-semibold", active ? "text-white/65" : "text-ink-400")}>
                  {d.tMin.toFixed(0)}°
                </span>
              </p>

              <div data-accent="solar" className="mt-4">
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.12em]",
                      active ? "text-white/65" : "text-ink-400",
                    )}
                  >
                    PV
                  </span>
                  <span className="num text-[13px] font-bold">{(d.pvEnergyKwh / 1000).toFixed(1)} MWh</span>
                </div>
                <div className={cn("mt-1.5 h-1.5 overflow-hidden rounded-full", active ? "bg-white/25" : "bg-ink-100")}>
                  <div
                    className={cn(
                      "h-full rounded-full",
                      active ? "bg-white" : "bg-gradient-to-r from-brand-300 to-brand-600",
                    )}
                    style={{ width: `${share * 100}%` }}
                  />
                </div>
              </div>

              <div
                className={cn(
                  "mt-4 flex items-center justify-between gap-1 text-[11px] font-medium",
                  active ? "text-white/80" : "text-ink-500",
                )}
              >
                <span className="inline-flex items-center gap-1" title="Mean cloud cover">
                  <Cloud className="size-3.5" />
                  {d.cloudAvg.toFixed(0)}%
                </span>
                <span className="inline-flex items-center gap-1" title="Precipitation probability">
                  <Droplets className="size-3.5" />
                  {d.precipProb.toFixed(0)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
