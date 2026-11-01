"use client";

import { useId, useMemo } from "react";
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
import { BATTERY } from "@/lib/site";
import { SUNRISE_MIN, SUNSET_MIN, getDayModel } from "@/lib/simulation";
import { zeroOffset } from "@/lib/chart";
import { formatClock } from "@/lib/format";
import { CHART, ENERGY, TARIFF_COLOR } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const STEP = 10;
const TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];
const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };

/** Discharging (supplying the campus) is the deep green, charging the lighter one. */
const CHARGE = "#34d399";
const DISCHARGE = ENERGY.battery.deep;

type Row = { minute: number; power: number | null; soc: number | null };

function buildRows(nowStep: number): Row[] {
  const model = getDayModel();
  const nowMin = nowStep * STEP;
  return Array.from({ length: 1440 / STEP + 1 }, (_, n) => {
    const t = n * STEP;
    const idx = Math.min(t, 1439);
    const past = t <= nowMin;
    return {
      minute: t,
      power: past ? model.batteryNet[idx] : null,
      soc: past ? model.soc[idx] * 100 : null,
    };
  });
}

const powerTick = (v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v) / 1000} MW`);

const offPeakLabel = {
  value: "Off-peak",
  position: "insideTop" as const,
  fill: "#059669",
  fontSize: 10.5,
  fontWeight: 700,
};

export function BatteryChart({ className }: { className?: string }) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const nowStep = Math.floor(minute / STEP);

  const rows = useMemo(() => buildRows(nowStep), [nowStep]);
  const offset = useMemo(() => zeroOffset(rows.map((r) => r.power)), [rows]);

  return (
    <Card className={className}>
      <CardHeader
        title="Power exchange & state of charge"
        subtitle="Above zero the battery supplies the campus · below zero it charges"
        icon={<Activity className="size-5" />}
        action={
          <div className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-[12px] font-semibold text-ink-600 md:flex">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: DISCHARGE }} />
              Discharging
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: CHARGE }} />
              Charging
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-ink-800" />
              State of charge
            </span>
          </div>
        }
      />

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 2, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DISCHARGE} stopOpacity={0.42} />
                <stop offset={offset} stopColor={DISCHARGE} stopOpacity={0.04} />
                <stop offset={offset} stopColor={CHARGE} stopOpacity={0.04} />
                <stop offset="100%" stopColor={CHARGE} stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={offset} stopColor={DISCHARGE} />
                <stop offset={offset} stopColor={CHARGE} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" yAxisId="power" />
            <ReferenceArea yAxisId="power" x1={0} x2={SUNRISE_MIN} fill="#eaf0fa" fillOpacity={0.55} />
            <ReferenceArea yAxisId="power" x1={SUNSET_MIN} x2={1440} fill="#eaf0fa" fillOpacity={0.55} />
            {/* Off-peak window: the battery tops up from the grid. */}
            <ReferenceArea yAxisId="power" x1={1320} x2={1440} fill={TARIFF_COLOR.offpeak} fillOpacity={0.14} label={offPeakLabel} />
            <ReferenceArea yAxisId="power" x1={0} x2={360} fill={TARIFF_COLOR.offpeak} fillOpacity={0.14} label={offPeakLabel} />

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
              yAxisId="power"
              width={62}
              domain={[-BATTERY.maxChargeKw, BATTERY.maxDischargeKw]}
              ticks={[-1000, -500, 0, 500, 1000]}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={powerTick}
            />
            <YAxis
              yAxisId="soc"
              orientation="right"
              width={46}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <ReferenceLine yAxisId="power" y={0} stroke="#b9c6df" />
            <ReferenceLine
              yAxisId="soc"
              y={BATTERY.socMax * 100}
              stroke="#8a9bbd"
              strokeDasharray="2 5"
              strokeOpacity={0.8}
              label={{
                value: `Max ${(BATTERY.socMax * 100).toFixed(0)} %`,
                position: "insideTopLeft",
                fill: "#8a9bbd",
                fontSize: 10.5,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              yAxisId="soc"
              y={BATTERY.socMin * 100}
              stroke="#8a9bbd"
              strokeDasharray="2 5"
              strokeOpacity={0.8}
              label={{
                value: `Min ${(BATTERY.socMin * 100).toFixed(0)} %`,
                position: "insideBottomRight",
                fill: "#8a9bbd",
                fontSize: 10.5,
                fontWeight: 600,
              }}
            />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => formatClock(Number(l) % 1440)}
                  valueFormatter={(v, item) =>
                    String(item.dataKey) === "soc"
                      ? `${v.toFixed(1)} %`
                      : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString("en-US")} kW`
                  }
                />
              }
            />

            <Area
              yAxisId="power"
              dataKey="power"
              name="Power"
              type="monotone"
              stroke={`url(#${uid}-stroke)`}
              strokeWidth={2.4}
              fill={`url(#${uid}-fill)`}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="soc"
              dataKey="soc"
              name="State of charge"
              type="monotone"
              stroke="#0d1b3e"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />

            <ReferenceLine
              yAxisId="power"
              x={nowStep * STEP}
              stroke={CHART.now}
              strokeWidth={1.5}
              strokeDasharray="2 4"
              label={{ value: "NOW", position: "top", fill: CHART.now, fontSize: 10.5, fontWeight: 700 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
