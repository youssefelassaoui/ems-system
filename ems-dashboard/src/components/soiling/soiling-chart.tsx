"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as ChartIcon } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import {
  CLEAN_THRESHOLD,
  HISTORY_DAYS,
  SOILING_EVENTS,
  getModuleSoiling,
  moduleLabel,
  type ModuleRef,
  type SystemSoiling,
} from "@/lib/soiling";
import { CHART, ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };
const MODULE_COLOR = "#0d1b3e";
const FLEET_COLOR = "#8a9bbd";
const EVENT_COLOR = { rain: "#3b82f6", wind: "#d97706", clean: "#10b981" } as const;

function dayLabel(dateISO: string, daysAgo: number) {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SoilingChart({
  index,
  system,
  fleetHistory,
  module: ref,
  className,
}: {
  index: number;
  system: SystemSoiling;
  fleetHistory: number[];
  module: ModuleRef;
  className?: string;
}) {
  const { dateISO } = useLive();
  const uid = useId().replace(/:/g, "");
  const cfg = PV_SYSTEMS[index];

  const rows = useMemo(
    () =>
      system.history.map((l, d) => ({
        day: d,
        system: l * 100,
        module: getModuleSoiling(index, ref, l).loss * 100,
        fleet: fleetHistory[d] * 100,
      })),
    [system.history, fleetHistory, index, ref],
  );

  const last = HISTORY_DAYS - 1;
  const events = [
    ...SOILING_EVENTS.map((e) => ({ x: last - e.daysAgo, label: e.label, color: EVENT_COLOR[e.kind] })),
    ...(system.cleanedDaysAgo <= last ? [{ x: last - system.cleanedDaysAgo, label: "Cleaned", color: EVENT_COLOR.clean }] : []),
  ];
  const top = Math.max(8, Math.ceil(Math.max(...rows.map((r) => Math.max(r.system, r.module))) / 2) * 2 + 2);
  const ticks = Array.from({ length: Math.floor(last / 5) + 1 }, (_, k) => last - k * 5).reverse();

  return (
    <Card className={className}>
      <CardHeader
        title="Soiling loss · last 30 days"
        subtitle={`${cfg.name} · rate ${(system.ratePerDay * 100).toFixed(2)} %/day · ${
          system.cleanedDaysAgo === 0 ? "cleaned today" : `cleaned ${system.cleanedDaysAgo} days ago`
        }`}
        icon={<ChartIcon className="size-5" />}
        action={
          <div className="hidden flex-wrap justify-end gap-x-4 gap-y-1 text-[12px] font-semibold text-ink-600 md:flex">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: ENERGY.dust.main }} />
              {cfg.short}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: MODULE_COLOR }} />
              Selected module
            </span>
            <span className="flex items-center gap-2">
              <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: FLEET_COLOR }} />
              Fleet average
            </span>
          </div>
        }
      />

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 18, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ENERGY.dust.main} stopOpacity={0.45} />
                <stop offset="100%" stopColor={ENERGY.dust.main} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, last]}
              ticks={ticks}
              tickFormatter={(d: number) => (d === last ? "Today" : dayLabel(dateISO, last - d))}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              width={52}
              domain={[0, top]}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />

            {events.map((e) => (
              <ReferenceLine
                key={e.label}
                x={e.x}
                stroke={e.color}
                strokeDasharray="3 4"
                strokeWidth={1.5}
                label={{ value: e.label, position: "top", fill: e.color, fontSize: 10.5, fontWeight: 700 }}
              />
            ))}
            <ReferenceLine
              y={CLEAN_THRESHOLD * 100}
              stroke="#b4441f"
              strokeDasharray="2 5"
              strokeOpacity={0.8}
              label={{
                value: `Clean at ${(CLEAN_THRESHOLD * 100).toFixed(0)} %`,
                position: "insideTopLeft",
                fill: "#b4441f",
                fontSize: 10.5,
                fontWeight: 600,
              }}
            />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => (Number(l) === last ? "Today (live)" : dayLabel(dateISO, last - Number(l)))}
                  valueFormatter={(v) => `${v.toFixed(2)} %`}
                />
              }
            />

            <Area
              dataKey="system"
              name={cfg.name}
              type="linear"
              stroke={ENERGY.dust.main}
              strokeWidth={2.4}
              fill={`url(#${uid}-fill)`}
              dot={false}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="module"
              name={moduleLabel(ref)}
              type="linear"
              stroke={MODULE_COLOR}
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              dataKey="fleet"
              name="Fleet average"
              type="linear"
              stroke={FLEET_COLOR}
              strokeWidth={1.6}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
