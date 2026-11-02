"use client";

import { CalendarClock, Droplets, Wind } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { SUNRISE_MIN, SUNSET_MIN } from "@/lib/simulation";
import type { DayForecast } from "@/lib/weather";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { WeatherIcon } from "./weather-icon";

export function HourlyStrip({ day, label }: { day: DayForecast; label: string }) {
  const { minute } = useLive();
  const first = Math.max(0, Math.floor(SUNRISE_MIN / 60));
  const last = Math.min(23, Math.ceil(SUNSET_MIN / 60));
  const hours = day.hourly.slice(first, last + 1);
  const peak = Math.max(...hours.map((h) => h.pv), 1);
  const nowHour = Math.floor(minute / 60);

  return (
    <Card>
      <CardHeader
        title="Hourly outlook"
        subtitle={`${label} · conditions and PV output by hour`}
        icon={<CalendarClock className="size-5" />}
      />
      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <ol className="flex w-full min-w-max gap-2.5">
          {hours.map((h) => {
            const isNow = day.index === 0 && h.hour === nowHour;
            return (
              <li
                key={h.hour}
                className={cn(
                  "flex min-w-[70px] flex-1 flex-col items-center rounded-2xl border px-2 py-3.5 text-center transition",
                  isNow
                    ? "border-brand-600/40 bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-glow"
                    : "border-line bg-white hover:border-brand-200",
                )}
              >
                <span className={cn("num text-[12px] font-semibold", isNow ? "text-white" : "text-ink-500")}>
                  {isNow ? "Now" : `${String(h.hour).padStart(2, "0")}:00`}
                </span>
                <WeatherIcon
                  condition={h.condition}
                  isDay={h.isDay}
                  tinted={!isNow}
                  className={cn("my-2.5 size-6", isNow && "text-white")}
                />
                <span className="font-display text-[17px] font-bold leading-none">{h.temp.toFixed(0)}°</span>

                <div className="mt-3 flex h-12 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-3.5 rounded-t-md",
                      isNow ? "bg-white" : "bg-gradient-to-t from-brand-300 to-brand-600",
                    )}
                    style={{ height: `${Math.max(4, (h.pv / peak) * 100)}%` }}
                  />
                </div>
                <span className={cn("num mt-1.5 text-[11.5px] font-bold", isNow ? "text-white" : "text-ink-800")}>
                  {h.pv >= 1000 ? `${(h.pv / 1000).toFixed(2)} MW` : `${Math.round(h.pv)} kW`}
                </span>

                <div
                  className={cn(
                    "mt-3 flex w-full flex-col gap-1 text-[10.5px] font-medium",
                    isNow ? "text-white/80" : "text-ink-400",
                  )}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <Droplets className="size-3" />
                    {h.precip.toFixed(0)}%
                  </span>
                  <span className="inline-flex items-center justify-center gap-1">
                    <Wind className="size-3" />
                    {h.wind.toFixed(0)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
