"use client";

import { useId, useMemo, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Gauge, ShieldCheck, Zap } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { TOTAL_KWP } from "@/lib/pv-systems";
import { SUNRISE_MIN, SUNSET_MIN, clearSkyGhi } from "@/lib/simulation";
import { pvFromGhi, type DayForecast } from "@/lib/weather";
import { formatClock } from "@/lib/format";
import { CHART, ENERGY } from "@/lib/palette";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const CLEAR_SKY_KWH = Array.from({ length: 24 }, (_, h) => pvFromGhi(clearSkyGhi(h * 60 + 30), 22)).reduce(
  (s, v) => s + v,
  0,
);

function bestWindow(day: DayForecast, hours = 4) {
  let best = { start: 0, sum: -1 };
  for (let s = 0; s <= 24 - hours; s++) {
    const sum = day.hourly.slice(s, s + hours).reduce((a, p) => a + p.pv, 0);
    if (sum > best.sum) best = { start: s, sum };
  }
  return { start: best.start, end: best.start + hours, share: day.pvEnergyKwh > 0 ? best.sum / day.pvEnergyKwh : 0 };
}

function Stat({
  icon,
  label,
  value,
  unit,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-4">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">
        <span className="text-brand-500 [&>svg]:size-3.5">{icon}</span>
        {label}
      </p>
      <p className="font-display mt-2 text-[24px] font-bold leading-none tracking-tight text-ink-900">
        {value}
        {unit && <span className="ml-1 text-[0.5em] font-semibold text-ink-400">{unit}</span>}
      </p>
      {hint && <p className="mt-2 text-[11.5px] leading-snug text-ink-400">{hint}</p>}
    </div>
  );
}

export function PvForecast({
  day,
  label,
  className,
}: {
  day: DayForecast;
  label: string;
  className?: string;
}) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const isToday = day.index === 0;
  const nowHour = Math.floor(minute / 60);

  const rows = useMemo(
    () =>
      day.hourly.map((h) => ({
        x: h.hour + 0.5,
        forecast: h.pv,
        low: h.pvLow,
        band: h.pvHigh - h.pvLow,
        high: h.pvHigh,
        actual: isToday && h.hour <= nowHour ? (h.pvActual ?? null) : null,
      })),
    [day, isToday, nowHour],
  );

  const lowKwh = day.hourly.reduce((s, p) => s + p.pvLow, 0);
  const highKwh = day.hourly.reduce((s, p) => s + p.pvHigh, 0);
  const win = bestWindow(day);
  const clearShare = day.pvEnergyKwh / CLEAR_SKY_KWH;

  return (
    <Card className={className}>
      <CardHeader
        title="PV production forecast"
        subtitle={`${label} · hourly fleet output with confidence range`}
        icon={<Activity className="size-5" />}
        action={
          <Badge tone={day.confidence === "Low" ? "warning" : day.confidence === "High" ? "success" : "brand"} dot>
            {day.confidence} confidence
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          icon={<Zap />}
          label="Expected energy"
          value={(day.pvEnergyKwh / 1000).toFixed(2)}
          unit="MWh"
          hint={`Range ${(lowKwh / 1000).toFixed(1)} – ${(highKwh / 1000).toFixed(1)} MWh`}
        />
        <Stat
          icon={<Gauge />}
          label="Peak power"
          value={day.pvPeakKw >= 1000 ? (day.pvPeakKw / 1000).toFixed(2) : day.pvPeakKw.toFixed(0)}
          unit={day.pvPeakKw >= 1000 ? "MW" : "kW"}
          hint={`Around ${formatClock(day.pvPeakHour * 60 + 30)}`}
        />
        <Stat
          icon={<Clock3 />}
          label="Best window"
          value={`${String(win.start).padStart(2, "0")}–${String(win.end).padStart(2, "0")}`}
          unit="h"
          hint={`${(win.share * 100).toFixed(0)}% of the day’s energy`}
        />
        <Stat
          icon={<ShieldCheck />}
          label="Specific yield"
          value={(day.pvEnergyKwh / TOTAL_KWP).toFixed(2)}
          unit="kWh/kWp"
          hint={`${(clearShare * 100).toFixed(0)}% of clear-sky potential`}
        />
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-ink-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-0 w-5 border-t-2 border-dashed border-brand-600" />
          Forecast
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm bg-brand-200/70" />
          Confidence range
        </span>
        {isToday && (
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-brand-700" />
            Measured
          </span>
        )}
      </div>

      <div className="h-[330px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 0, left: -2 }}>
            <defs>
              <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENERGY.solar.soft} stopOpacity={0.5} />
                <stop offset="100%" stopColor={ENERGY.solar.soft} stopOpacity={0.14} />
              </linearGradient>
              <linearGradient id={`${uid}-act`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENERGY.solar.main} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ENERGY.solar.main} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
            <ReferenceArea x1={0} x2={SUNRISE_MIN / 60} fill="#eaf0fa" fillOpacity={0.55} />
            <ReferenceArea x1={SUNSET_MIN / 60} x2={24} fill="#eaf0fa" fillOpacity={0.55} />

            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 24]}
              ticks={TICKS}
              tickFormatter={(v: number) => formatClock((v % 24) * 60)}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              width={66}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} MW` : `${Math.round(v)} kW`)}
            />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => {
                    const h = Math.floor(Number(l));
                    return `${formatClock(h * 60)} – ${formatClock((h + 1) * 60)}`;
                  }}
                  valueFormatter={(v) => `${Math.round(v).toLocaleString("en-US")} kW`}
                  hiddenKeys={["band"]}
                />
              }
            />

            <Area dataKey="low" name="Low estimate" stackId="band" type="monotone" stroke="none" fill="transparent" isAnimationActive={false} activeDot={false} />
            <Area dataKey="band" name="Range" stackId="band" type="monotone" stroke="none" fill={`url(#${uid}-band)`} isAnimationActive={false} activeDot={false} />
            <Line dataKey="high" name="High estimate" type="monotone" stroke={ENERGY.solar.soft} strokeWidth={1} strokeOpacity={0.9} dot={false} activeDot={false} isAnimationActive={false} />

            {isToday && (
              <Area
                dataKey="actual"
                name="Measured"
                type="monotone"
                stroke={ENERGY.solar.deep}
                strokeWidth={2.6}
                fill={`url(#${uid}-act)`}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
            <Line
              dataKey="forecast"
              name="Forecast"
              type="monotone"
              stroke={ENERGY.solar.main}
              strokeWidth={2.4}
              strokeDasharray="7 6"
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {isToday && (
              <ReferenceLine
                x={Math.floor(minute / 10) / 6}
                stroke={CHART.now}
                strokeWidth={1.5}
                strokeDasharray="2 4"
                label={{ value: "NOW", position: "top", fill: CHART.now, fontSize: 10.5, fontWeight: 700 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}