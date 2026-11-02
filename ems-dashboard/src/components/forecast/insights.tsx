"use client";

import { useMemo, type ReactNode } from "react";
import { BatteryCharging, CalendarCheck, CloudRain, Lightbulb, SunMedium, TrendingUp } from "lucide-react";
import { getAccuracyHistory, type DayForecast } from "@/lib/weather";
import { Card, CardHeader } from "@/components/ui/card";
import { dayLabel } from "./day-label";

function Insight({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5 rounded-2xl border border-line bg-white p-3.5 transition hover:border-brand-200 hover:shadow-soft">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 [&>svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{children}</p>
      </div>
    </li>
  );
}

export function Insights({
  days,
  dateISO,
  className,
}: {
  days: DayForecast[];
  dateISO: string;
  className?: string;
}) {
  const data = useMemo(() => {
    const best = days.reduce((a, d) => (d.pvEnergyKwh > a.pvEnergyKwh ? d : a), days[0]);
    const worst = days.reduce((a, d) => (d.pvEnergyKwh < a.pvEnergyKwh ? d : a), days[0]);
    const rain = days.find((d) => d.index > 0 && d.precipProb >= 50);
    const total = days.reduce((s, d) => s + d.pvEnergyKwh, 0);
    const previous = getAccuracyHistory().reduce((s, p) => s + p.actualKwh, 0);
    return { best, worst, rain, total, previous };
  }, [days]);

  const { best, worst, rain, total, previous } = data;
  const change = ((total - previous) / previous) * 100;
  const lowSolar = worst.pvEnergyKwh < best.pvEnergyKwh * 0.6;

  return (
    <Card className={className}>
      <CardHeader
        title="Planning insights"
        subtitle="Operational hints from the 7-day outlook"
        icon={<Lightbulb className="size-5" />}
      />
      <ul className="space-y-3">
        <Insight icon={<TrendingUp />} title={`${(total / 1000).toFixed(1)} MWh expected this week`}>
          {change >= 0 ? "Up" : "Down"} <strong className="font-semibold text-ink-700">{Math.abs(change).toFixed(0)}%</strong>{" "}
          versus the previous 7 days of measured production.
        </Insight>
        <Insight icon={<SunMedium />} title={`Best solar day · ${dayLabel(best.index, dateISO).long}`}>
          {(best.pvEnergyKwh / 1000).toFixed(1)} MWh with {best.cloudAvg.toFixed(0)}% mean cloud cover — ideal for
          flexible loads such as EV fleet charging.
        </Insight>
        {lowSolar && (
          <Insight icon={<BatteryCharging />} title={`Low solar · ${dayLabel(worst.index, dateISO).long}`}>
            Only {(worst.pvEnergyKwh / 1000).toFixed(1)} MWh expected. Schedule an off-peak battery top-up
            (22:00 – 06:00) the night before.
          </Insight>
        )}
        {rain ? (
          <Insight icon={<CloudRain />} title={`Rain · ${dayLabel(rain.index, dateISO).long}`}>
            {rain.precipProb.toFixed(0)}% precipitation probability — natural cleaning for the soiled PV System 4 modules.
          </Insight>
        ) : (
          <Insight icon={<CalendarCheck />} title="Dry week ahead">
            No significant rain expected — a good window to clean the PV System 4 modules.
          </Insight>
        )}
      </ul>
    </Card>
  );
}
