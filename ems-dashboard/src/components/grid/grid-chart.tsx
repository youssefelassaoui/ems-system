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
import { ArrowDownUp } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { SUNRISE_MIN, SUNSET_MIN, getDayModel } from "@/lib/simulation";
import { zeroOffset } from "@/lib/chart";
import { formatClock } from "@/lib/format";
import { CHART, ENERGY, TARIFF_COLOR } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const STEP = 10;
const TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];
const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };

/** Importing is the network indigo; exporting the solar surplus is a lighter indigo. */
const IMPORT = ENERGY.grid.main;
const EXPORT = ENERGY.grid.soft;

type Row = { minute: number; net: number | null; load: number | null };

function buildRows(nowStep: number): Row[] {
  const model = getDayModel();
  const nowMin = nowStep * STEP;
  return Array.from({ length: 1440 / STEP + 1 }, (_, n) => {
    const t = n * STEP;
    const idx = Math.min(t, 1439);
    const past = t <= nowMin;
    return {
      minute: t,
      net: past ? model.gridNet[idx] : null,
      load: past ? model.load[idx] : null,
    };
  });
}

const offPeakLabel = {
  value: "Off-peak",
  position: "insideTop" as const,
  fill: "#059669",
  fontSize: 10.5,
  fontWeight: 700,
};

export function GridChart({ className }: { className?: string }) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const nowStep = Math.floor(minute / STEP);

  const rows = useMemo(() => buildRows(nowStep), [nowStep]);
  const offset = useMemo(() => zeroOffset(rows.map((r) => r.net)), [rows]);

  return (
    <Card className={className}>
      <CardHeader
        title="Grid exchange"
        subtitle="Above zero the campus imports from the network · below zero it exports its solar surplus"
        icon={<ArrowDownUp className="size-5" />}
        action={
          <div className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-[12px] font-semibold text-ink-600 md:flex">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: IMPORT }} />
              Import
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: EXPORT }} />
              Export
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full bg-ink-400" />
              Campus load
            </span>
          </div>
        }
      />

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 0, left: -2 }}>
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={IMPORT} stopOpacity={0.4} />
                <stop offset={offset} stopColor={IMPORT} stopOpacity={0.04} />
                <stop offset={offset} stopColor={EXPORT} stopOpacity={0.04} />
                <stop offset="100%" stopColor={EXPORT} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={offset} stopColor={IMPORT} />
                <stop offset={offset} stopColor={EXPORT} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
            <ReferenceArea x1={0} x2={SUNRISE_MIN} fill="#eaf0fa" fillOpacity={0.55} />
            <ReferenceArea x1={SUNSET_MIN} x2={1440} fill="#eaf0fa" fillOpacity={0.55} />
            <ReferenceArea x1={1320} x2={1440} fill={TARIFF_COLOR.offpeak} fillOpacity={0.14} label={offPeakLabel} />
            <ReferenceArea x1={0} x2={360} fill={TARIFF_COLOR.offpeak} fillOpacity={0.14} label={offPeakLabel} />

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
              width={66}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v === 0 ? "0" : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)} MW` : `${Math.round(v)} kW`
              }
            />
            <ReferenceLine y={0} stroke="#b9c6df" />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => formatClock(Number(l) % 1440)}
                  valueFormatter={(v, item) => {
                    const kw = `${Math.abs(Math.round(v)).toLocaleString("en-US")} kW`;
                    if (String(item.dataKey) === "load") return kw;
                    return v > 15 ? `Import ${kw}` : v < -15 ? `Export ${kw}` : "Balanced";
                  }}
                />
              }
            />

            <Line
              dataKey="load"
              name="Campus load"
              type="monotone"
              stroke="#8a9bbd"
              strokeWidth={1.6}
              strokeDasharray="1.5 5"
              strokeLinecap="round"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="net"
              name="Grid"
              type="monotone"
              stroke={`url(#${uid}-stroke)`}
              strokeWidth={2.4}
              fill={`url(#${uid}-fill)`}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />

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
    </Card>
  );
}
