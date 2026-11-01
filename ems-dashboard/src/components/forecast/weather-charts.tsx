"use client";

import { useId, useMemo } from "react";
import {
  Area,
  Bar,
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
import { CloudSun, Thermometer } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { SUNRISE_MIN, SUNSET_MIN } from "@/lib/simulation";
import type { DayForecast } from "@/lib/weather";
import { formatClock } from "@/lib/format";
import { CHART, ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const hourLabel = (l: string | number) => {
  const h = Math.floor(Number(l));
  return `${formatClock(h * 60)} – ${formatClock((h + 1) * 60)}`;
};

function ChartFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-[280px] w-full">{children}</div>;
}

const sharedX = (
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
);

const nightAreas = [
  <ReferenceArea key="a" x1={0} x2={SUNRISE_MIN / 60} fill="#eaf0fa" fillOpacity={0.55} />,
  <ReferenceArea key="b" x1={SUNSET_MIN / 60} x2={24} fill="#eaf0fa" fillOpacity={0.55} />,
];

export function WeatherCharts({ day }: { day: DayForecast }) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const isToday = day.index === 0;
  const nowHour = Math.floor(minute / 60);

  const rows = useMemo(
    () =>
      day.hourly.map((h) => ({
        x: h.hour + 0.5,
        ghi: h.ghi,
        ghiActual: isToday && h.hour <= nowHour ? (h.ghiActual ?? null) : null,
        cloud: h.cloud,
        temp: h.temp,
        precip: h.precip,
      })),
    [day, isToday, nowHour],
  );

  const nowLine = isToday ? (
    <ReferenceLine
      x={Math.floor(minute / 10) / 6}
      stroke={CHART.now}
      strokeWidth={1.5}
      strokeDasharray="2 4"
      label={{ value: "NOW", position: "top", fill: CHART.now, fontSize: 10.5, fontWeight: 700 }}
    />
  ) : null;

  const temps = rows.map((r) => r.temp);
  const tMin = Math.floor((Math.min(...temps) - 1) / 5) * 5;
  const tMax = Math.ceil((Math.max(...temps) + 1) / 5) * 5;
  const tTicks = Array.from({ length: (tMax - tMin) / 5 + 1 }, (_, i) => tMin + i * 5);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card data-accent="solar">
        <CardHeader
          title="Solar irradiance & clouds"
          subtitle="Global horizontal irradiance and cloud cover"
          icon={<CloudSun className="size-5" />}
        />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 14, right: 0, bottom: 0, left: -4 }}>
              <defs>
                <linearGradient id={`${uid}-ghi`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ENERGY.solar.main} stopOpacity={0.38} />
                  <stop offset="100%" stopColor={ENERGY.solar.main} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
              {nightAreas}
              {sharedX}
              <YAxis
                yAxisId="ghi"
                width={50}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[0, 1000]}
                ticks={[0, 250, 500, 750, 1000]}
              />
              <YAxis
                yAxisId="cloud"
                orientation="right"
                width={42}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
                content={
                  <ChartTooltip
                    labelFormatter={hourLabel}
                    valueFormatter={(v, item) =>
                      item.dataKey === "cloud" ? `${Math.round(v)} %` : `${Math.round(v)} W/m²`
                    }
                  />
                }
              />
              <Area
                yAxisId="ghi"
                dataKey="ghi"
                name={isToday ? "GHI forecast" : "GHI"}
                type="monotone"
                stroke={ENERGY.solar.main}
                strokeWidth={isToday ? 2 : 2.4}
                strokeDasharray={isToday ? "6 6" : undefined}
                fill={isToday ? "transparent" : `url(#${uid}-ghi)`}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {isToday && (
                <Area
                  yAxisId="ghi"
                  dataKey="ghiActual"
                  name="GHI measured"
                  type="monotone"
                  stroke={ENERGY.solar.deep}
                  strokeWidth={2.6}
                  fill={`url(#${uid}-ghi)`}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
              <Line
                yAxisId="cloud"
                dataKey="cloud"
                name="Cloud cover"
                type="monotone"
                stroke="#6b7fa8"
                strokeWidth={1.8}
                strokeDasharray="1.5 5"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {nowLine}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>

      <Card>
        <CardHeader
          title="Temperature & precipitation"
          subtitle="Ambient air temperature and chance of rain"
          icon={<Thermometer className="size-5" />}
        />
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 14, right: 0, bottom: 0, left: -4 }}>
              <defs>
                <linearGradient id={`${uid}-temp`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f0603a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f0603a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
              {nightAreas}
              {sharedX}
              <YAxis
                yAxisId="temp"
                width={50}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[tMin, tMax]}
                ticks={tTicks}
                tickFormatter={(v: number) => `${v}°`}
              />
              <YAxis
                yAxisId="precip"
                orientation="right"
                width={42}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
                content={
                  <ChartTooltip
                    labelFormatter={hourLabel}
                    valueFormatter={(v, item) =>
                      item.dataKey === "temp" ? `${v.toFixed(1)} °C` : `${Math.round(v)} %`
                    }
                  />
                }
              />
              <Bar
                yAxisId="precip"
                dataKey="precip"
                name="Rain probability"
                fill="#7dc4f7"
                fillOpacity={0.8}
                radius={[6, 6, 0, 0]}
                barSize={12}
                isAnimationActive={false}
              />
              <Area
                yAxisId="temp"
                dataKey="temp"
                name="Temperature"
                type="monotone"
                stroke="#f0603a"
                strokeWidth={2.4}
                fill={`url(#${uid}-temp)`}
                dot={false}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              {nowLine}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>
      </Card>
    </div>
  );
}
