"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Target } from "lucide-react";
import { addDays, formatDate, getAccuracyHistory } from "@/lib/weather";
import { ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

const axisTick = { fill: "#8a9bbd", fontSize: 11.5, fontWeight: 500 };

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="font-display mt-2 text-[26px] font-bold leading-none tracking-tight text-ink-900">{value}</p>
      <p className="mt-2 text-[11.5px] text-ink-400">{hint}</p>
    </div>
  );
}

export function Accuracy({ dateISO, className }: { dateISO: string; className?: string }) {
  const { rows, mape, bias, within, best } = useMemo(() => {
    const history = getAccuracyHistory();
    const rows = history.map((p) => ({
      label: formatDate(addDays(dateISO, p.offset), { weekday: "short" }),
      date: formatDate(addDays(dateISO, p.offset), { weekday: "short", day: "numeric", month: "short" }),
      actual: p.actualKwh / 1000,
      forecast: p.forecastKwh / 1000,
      error: p.errorPct,
    }));
    const mape = history.reduce((s, p) => s + Math.abs(p.errorPct), 0) / history.length;
    const bias = history.reduce((s, p) => s + p.errorPct, 0) / history.length;
    const within = history.filter((p) => Math.abs(p.errorPct) <= 10).length;
    const best = rows.reduce((a, r) => (Math.abs(r.error) < Math.abs(a.error) ? r : a), rows[0]);
    return { rows, mape, bias, within, best };
  }, [dateISO]);

  return (
    <Card className={className}>
      <CardHeader
        title="Forecast accuracy"
        subtitle="Day-ahead PV forecast versus measured production · last 7 days"
        icon={<Target className="size-5" />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 14, right: 0, bottom: 0, left: -6 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 7" vertical={false} stroke="#e4ebf7" />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis
                yAxisId="e"
                width={68}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v} MWh`}
              />
              <YAxis
                yAxisId="p"
                orientation="right"
                width={42}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                domain={[-30, 30]}
                ticks={[-30, -15, 0, 15, 30]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ReferenceLine yAxisId="p" y={0} stroke="#b9c6df" strokeDasharray="3 5" />
              <Tooltip
                cursor={{ fill: "var(--color-brand-100)", fillOpacity: 0.55, radius: 12 }}
                content={
                  <ChartTooltip
                    labelFormatter={(l) => rows.find((r) => r.label === l)?.date ?? l}
                    valueFormatter={(v, item) =>
                      item.dataKey === "error"
                        ? `${v > 0 ? "+" : ""}${v.toFixed(1)} %`
                        : `${v.toFixed(2)} MWh`
                    }
                  />
                }
              />
              <Bar yAxisId="e" dataKey="actual" name="Measured" fill={ENERGY.solar.main} radius={[8, 8, 0, 0]} barSize={20} isAnimationActive={false} />
              <Bar yAxisId="e" dataKey="forecast" name="Forecast" fill="#fde2a0" radius={[8, 8, 0, 0]} barSize={20} isAnimationActive={false} />
              <Line
                yAxisId="p"
                dataKey="error"
                name="Error"
                type="monotone"
                stroke={ENERGY.solar.deep}
                strokeWidth={2}
                dot={{ r: 3.5, fill: "#fff", stroke: ENERGY.solar.deep, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="MAPE" value={`${mape.toFixed(1)}%`} hint="Mean absolute error" />
            <Metric label="Bias" value={`${bias > 0 ? "+" : ""}${bias.toFixed(1)}%`} hint={bias >= 0 ? "Slight over-forecast" : "Slight under-forecast"} />
          </div>
          <Metric label="Within ±10 %" value={`${within} / ${rows.length} days`} hint="Days meeting the accuracy target" />
          <Metric label="Best day" value={best.date} hint={`${Math.abs(best.error).toFixed(1)}% absolute error`} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-medium text-ink-500">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: ENERGY.solar.main }} />
          Measured
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: "#fde2a0" }} />
          Forecast
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full border-2 bg-white" style={{ borderColor: ENERGY.solar.deep }} />
          Error (right axis)
        </span>
      </div>
    </Card>
  );
}