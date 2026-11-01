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
import { AreaChart as AreaChartIcon } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { PV_BY_ID, PV_SYSTEMS } from "@/lib/pv-systems";
import { SUNRISE_MIN, SUNSET_MIN, getDayModel } from "@/lib/simulation";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CHART, ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { Segmented } from "@/components/ui/segmented";

export type ChartMode = "power" | "energy";
export type Selection = "all" | (typeof PV_SYSTEMS)[number]["id"];

const STEP = 10;
const TICKS = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440];
const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };
const SYSTEM_KEYS = PV_SYSTEMS.map((p) => p.id);

type Row = { minute: number } & Record<string, number | null>;

function buildRows(nowStep: number, mode: ChartMode, selection: Selection): Row[] {
  const model = getDayModel();
  const nowMin = nowStep * STEP;
  const single = selection === "all" ? null : PV_SYSTEMS.findIndex((p) => p.id === selection);
  const sum = (arr: (i: number) => number) => PV_SYSTEMS.reduce((s, _, i) => s + arr(i), 0);

  return Array.from({ length: 1440 / STEP + 1 }, (_, n) => {
    const t = n * STEP;
    const idx = Math.min(t, 1439);
    const past = t <= nowMin;
    const future = t >= nowMin;
    const row: Row = { minute: t };

    if (mode === "power") {
      if (single === null) {
        PV_SYSTEMS.forEach((p, i) => {
          row[p.id] = past ? model.systems[i].power[idx] : null;
        });
        row.forecast = future ? model.pvForecast[idx] : null;
        row.clear = model.pvClearSky[idx];
      } else {
        const s = model.systems[single];
        row.actual = past ? s.power[idx] : null;
        row.forecast = future ? s.forecast[idx] : null;
        row.clear = s.clearSky[idx];
      }
    } else if (single === null) {
      PV_SYSTEMS.forEach((p, i) => {
        row[p.id] = past ? model.systems[i].cumEnergy[t] : null;
      });
      const nowTotal = sum((i) => model.systems[i].cumEnergy[nowMin]);
      row.forecast = future ? nowTotal + (model.cumFleetForecast[t] - model.cumFleetForecast[nowMin]) : null;
    } else {
      const s = model.systems[single];
      row.actual = past ? s.cumEnergy[t] : null;
      row.forecast = future ? s.cumEnergy[nowMin] + (s.cumForecast[t] - s.cumForecast[nowMin]) : null;
    }
    return row;
  });
}

export function ProductionChart({
  selection,
  onSelect,
  mode,
  onModeChange,
  className,
}: {
  selection: Selection;
  onSelect: (s: Selection) => void;
  mode: ChartMode;
  onModeChange: (m: ChartMode) => void;
  className?: string;
}) {
  const { minute } = useLive();
  const uid = useId().replace(/:/g, "");
  const nowStep = Math.floor(minute / STEP);
  const rows = useMemo(() => buildRows(nowStep, mode, selection), [nowStep, mode, selection]);

  const unit = mode === "power" ? "kW" : "kWh";
  const single = selection === "all" ? null : PV_BY_ID[selection];
  const accent = single?.color ?? ENERGY.solar.main;

  const yFormat = (v: number) =>
    mode === "power"
      ? v >= 1000
        ? `${(v / 1000).toFixed(1)} MW`
        : `${Math.round(v)} kW`
      : v >= 1000
        ? `${(v / 1000).toFixed(1)} MWh`
        : `${Math.round(v)} kWh`;

  const valueFormat = (v: number) => {
    const rounded = Math.round(v);
    return `${rounded.toLocaleString("en-US")} ${unit}`;
  };

  return (
    <Card className={className}>
      <CardHeader
        title={single ? `${single.name} — ${mode === "power" ? "power curve" : "cumulative energy"}` : mode === "power" ? "Fleet power by system" : "Fleet cumulative energy"}
        subtitle={
          mode === "power"
            ? "Measured until now · dashed line is the forecast · dotted line is clear-sky potential"
            : "Energy accumulated since midnight · dashed line is the projected total"
        }
        icon={<AreaChartIcon className="size-5" />}
        action={
          <Segmented<ChartMode>
            ariaLabel="Chart mode"
            value={mode}
            onChange={onModeChange}
            options={[
              { value: "power", label: "Power" },
              { value: "energy", label: "Cumulative" },
            ]}
          />
        }
      />

      {/* System selector */}
      <div className="-mt-1 mb-4 flex flex-wrap gap-1.5">
        <SelectorChip active={selection === "all"} onClick={() => onSelect("all")}>
          <span className="flex -space-x-1">
            {PV_SYSTEMS.slice(0, 3).map((p) => (
              <span key={p.id} className="size-2.5 rounded-full ring-2 ring-white" style={{ background: p.color }} />
            ))}
          </span>
          All systems
        </SelectorChip>
        {PV_SYSTEMS.map((p) => (
          <SelectorChip key={p.id} active={selection === p.id} onClick={() => onSelect(p.id)}>
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.short}
            <span className="font-medium text-ink-400">{p.technology.short}</span>
          </SelectorChip>
        ))}
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 0, left: -2 }}>
            <defs>
              <linearGradient id={`${uid}-single`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.42} />
                <stop offset="100%" stopColor={accent} stopOpacity={0.03} />
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
            <YAxis width={66} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={yFormat} />

            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => formatClock(Number(l) % 1440)}
                  valueFormatter={(v) => valueFormat(v)}
                  hiddenKeys={mode === "power" ? ["clear"] : []}
                  totalLabel={single ? undefined : "Fleet total"}
                  totalKeys={SYSTEM_KEYS}
                />
              }
            />

            {single === null ? (
              <>
                {PV_SYSTEMS.map((p) => (
                  <Area
                    key={p.id}
                    dataKey={p.id}
                    name={`${p.short} · ${p.technology.short}`}
                    stackId="fleet"
                    type="monotone"
                    stroke={p.color}
                    strokeWidth={1.2}
                    fill={p.color}
                    fillOpacity={0.9}
                    dot={false}
                    activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                ))}
                {mode === "power" && (
                  <Line
                    dataKey="clear"
                    name="Clear-sky potential"
                    type="monotone"
                    stroke="#6b7fa8"
                    strokeWidth={1.4}
                    strokeDasharray="1.5 5"
                    strokeLinecap="round"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
              </>
            ) : (
              <>
                {mode === "power" && (
                  <Line
                    dataKey="clear"
                    name="Clear-sky potential"
                    type="monotone"
                    stroke="#6b7fa8"
                    strokeWidth={1.4}
                    strokeDasharray="1.5 5"
                    strokeLinecap="round"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
                <Area
                  dataKey="actual"
                  name="Measured"
                  type="monotone"
                  stroke={accent}
                  strokeWidth={2.6}
                  fill={`url(#${uid}-single)`}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </>
            )}

            <Line
              dataKey="forecast"
              name="Forecast"
              type="monotone"
              stroke={single ? accent : ENERGY.solar.deep}
              strokeOpacity={0.75}
              strokeWidth={2.2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={false}
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

function SelectorChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition",
        active
          ? "border-brand-300 bg-brand-50 text-brand-700 shadow-soft"
          : "border-line bg-white text-ink-500 hover:border-brand-200 hover:text-ink-800",
      )}
    >
      {children}
    </button>
  );
}
