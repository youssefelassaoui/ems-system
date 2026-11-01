"use client";

import { useId, useMemo, useState } from "react";
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
import { Activity } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import {
  SUNRISE_MIN,
  SUNSET_MIN,
  getDayModel,
} from "@/lib/simulation";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CHART, ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const STEP = 10;
const TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];

const SERIES = [
  { key: "pv", label: "Solar PV", color: ENERGY.solar.main },
  { key: "load", label: "Campus load", color: ENERGY.load.main },
  { key: "battery", label: "Battery", color: ENERGY.battery.main },
  { key: "grid", label: "Grid", color: ENERGY.grid.main },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };

export function PowerProfile({ className }: { className?: string }) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    pv: true,
    load: true,
    battery: true,
    grid: false,
  });

  const nowStep = Math.floor(minute / STEP);

  const data = useMemo(() => {
    const m = getDayModel();
    const nowMin = nowStep * STEP;
    return Array.from({ length: 1440 / STEP + 1 }, (_, i) => {
      const t = i * STEP;
      const idx = Math.min(t, 1439);
      const past = t <= nowMin;
      const future = t >= nowMin;
      return {
        minute: t,
        pv: past ? m.pv[idx] : null,
        load: past ? m.load[idx] : null,
        battery: past ? m.batteryNet[idx] : null,
        grid: past ? m.gridNet[idx] : null,
        pvForecast: future ? m.pvForecast[idx] : null,
        loadForecast: future ? m.loadForecast[idx] : null,
      };
    });
  }, [nowStep]);

  const toggle = (k: SeriesKey) => setVisible((v) => ({ ...v, [k]: !v[k] }));

  return (
    <Card className={className}>
      <CardHeader
        title="Daily power profile"
        subtitle="Measured until now · dashed lines show the forecast"
        icon={<Activity className="size-5" />}
        action={
          <div className="flex flex-wrap justify-end gap-1.5">
            {SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={visible[s.key]}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                  visible[s.key]
                    ? "border-line bg-white text-ink-800 shadow-soft"
                    : "border-transparent bg-ink-50 text-ink-400",
                )}
              >
                <span
                  className="size-2 rounded-full transition-opacity"
                  style={{ background: s.color, opacity: visible[s.key] ? 1 : 0.35 }}
                />
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 14, right: 8, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id={`${uid}-pv`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENERGY.solar.main} stopOpacity={0.4} />
                <stop offset="100%" stopColor={ENERGY.solar.main} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${uid}-batt`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENERGY.battery.main} stopOpacity={0.32} />
                <stop offset="100%" stopColor={ENERGY.battery.main} stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
            <ReferenceArea x1={0} x2={SUNRISE_MIN} fill="#eaf0fa" fillOpacity={0.55} />
            <ReferenceArea x1={SUNSET_MIN} x2={1440} fill="#eaf0fa" fillOpacity={0.55} />

            <XAxis
              dataKey="minute"
              type="number"
              domain={[0, 1440]}
              ticks={TICKS}
              tickFormatter={(v: number) => formatClock(v % 1440)}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              width={58}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} MW` : `${v} kW`
              }
            />
            <ReferenceLine y={0} stroke="#b9c6df" />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => formatClock(Number(l) % 1440)}
                  valueFormatter={(v) => `${Math.round(v).toLocaleString("en-US")} kW`}
                />
              }
            />

            {visible.pv && (
              <>
                <Area
                  dataKey="pv"
                  name="Solar PV"
                  type="monotone"
                  stroke={ENERGY.solar.main}
                  strokeWidth={2.4}
                  fill={`url(#${uid}-pv)`}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="pvForecast"
                  name="PV forecast"
                  type="monotone"
                  stroke={ENERGY.solar.main}
                  strokeOpacity={0.6}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </>
            )}
            {visible.battery && (
              <Area
                dataKey="battery"
                name="Battery"
                type="monotone"
                stroke={ENERGY.battery.main}
                strokeWidth={2}
                fill={`url(#${uid}-batt)`}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
            {visible.grid && (
              <Line
                dataKey="grid"
                name="Grid"
                type="monotone"
                stroke={ENERGY.grid.main}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
            {visible.load && (
              <>
                <Line
                  dataKey="load"
                  name="Campus load"
                  type="monotone"
                  stroke={ENERGY.load.main}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="loadForecast"
                  name="Load forecast"
                  type="monotone"
                  stroke={ENERGY.load.main}
                  strokeOpacity={0.4}
                  strokeWidth={1.8}
                  strokeDasharray="6 6"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </>
            )}

            <ReferenceLine
              x={nowStep * STEP}
              stroke={CHART.now}
              strokeWidth={1.5}
              strokeDasharray="2 4"
              label={{ value: "NOW", position: "top", fill: CHART.now, fontSize: 10.5, fontWeight: 700 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-[12px] text-ink-400">
        Positive battery / grid values supply the campus · negative values mean charging / exporting.
      </p>
    </Card>
  );
}
