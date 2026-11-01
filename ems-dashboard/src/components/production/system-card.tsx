"use client";

import { memo, useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Layers, Wrench } from "lucide-react";
import { getDayModel, type SystemSnapshot } from "@/lib/simulation";
import { formatInverters, needsBifacialTag, type PvSystemConfig } from "@/lib/pv-systems";
import { formatEnergy, formatMwh, joinQuantity, percent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { shade } from "@/lib/palette";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { StatusBadge } from "@/components/ui/badge";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { Sparkline } from "@/components/ui/sparkline";

const STEP = 10;

interface SystemCardProps {
  config: PvSystemConfig;
  index: number;
  snapshot: SystemSnapshot;
  nowStep: number;
  selected: boolean;
  onSelect: () => void;
  delayMs?: number;
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-ink-50/80 px-3 py-2.5 ring-1 ring-inset ring-ink-100">
      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="num mt-1 text-[15px] font-bold leading-none text-ink-900">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-semibold text-ink-400">{unit}</span>}
      </p>
    </div>
  );
}

function Spec({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-ink-50/80 px-3 py-2.5 ring-1 ring-inset ring-ink-100">
      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="num mt-1 truncate text-[14px] font-bold leading-none text-ink-900">{value}</p>
      <p className="mt-1 truncate text-[10.5px] text-ink-400">{sub}</p>
    </div>
  );
}

export const SystemCard = memo(function SystemCard({
  config,
  index,
  snapshot: s,
  nowStep,
  selected,
  onSelect,
  delayMs = 0,
}: SystemCardProps) {
  const series = useMemo(() => {
    const power = getDayModel().systems[index].power;
    return Array.from({ length: Math.max(2, nowStep + 1) }, (_, i) => power[Math.min(i * STEP, 1439)]);
  }, [index, nowStep]);

  const peak = Math.max(1, config.acLimitKw);
  const todayProgress = s.projectedKwh > 0 ? s.todayKwh / s.projectedKwh : 0;
  const notOnline = config.status !== "online";

  return (
    <article
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      style={{ animationDelay: `${delayMs}ms` }}
      className={cn(
        "enter group relative cursor-pointer overflow-hidden rounded-[28px] border bg-white p-5 text-left shadow-card outline-none transition duration-300 sm:p-6",
        "hover:-translate-y-0.5 hover:shadow-accent-lift focus-visible:ring-2 focus-visible:ring-brand-400",
        selected ? "border-brand-400 ring-2 ring-brand-200" : "border-line",
      )}
    >
      {/* accent edge */}
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${config.color}, ${config.color}00)` }}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: config.color }} />
            <h3 className="font-display truncate text-[16px] font-semibold text-ink-900">{config.name}</h3>
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-700 ring-1 ring-inset ring-brand-100">
              {config.technology.short}
            </span>
          </div>
          <p className="mt-1 truncate text-[12.5px] text-ink-400">
            {config.kWp} kWp · {config.orientation}
          </p>
        </div>
        <StatusBadge status={config.status} />
      </header>

      {/* Real-time block */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Real-time output</p>
          <AnimatedQuantity
            value={s.powerKw}
            kind="power"
            className="font-display mt-1 block text-[34px] font-bold leading-none tracking-tight text-ink-900"
            unitClassName="ml-1 text-[0.45em] font-semibold text-ink-400"
          />
          <p className="mt-2 text-[12px] text-ink-400">
            of <span className="font-semibold text-ink-600">{config.acLimitKw} kW</span> AC limit
          </p>
        </div>
        <RadialGauge value={s.utilisation} size={86} stroke={9} from={config.color} to={shade(config.color, 0.4)} arc>
          <div className="pt-1">
            <div className="num text-[17px] font-bold leading-none text-ink-900">
              <AnimatedNumber value={s.utilisation * 100} decimals={0} />
              <span className="text-[10px] text-ink-400">%</span>
            </div>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">load</p>
          </div>
        </RadialGauge>
      </div>

      <div className="mt-3 -mb-1">
        <Sparkline data={series} color={config.color} height={50} max={peak} min={0} />
        <div className="mt-1 flex justify-between text-[10.5px] font-medium text-ink-300">
          <span>00:00</span>
          <span>Today</span>
          <span>Now</span>
        </div>
      </div>

      {/* Cumulative production */}
      <div className="mt-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/90 to-white p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-600">
              Cumulative today
            </p>
            <AnimatedQuantity
              value={s.todayKwh}
              kind="energy"
              className="font-display mt-1 block text-[24px] font-bold leading-none text-ink-900"
              unitClassName="ml-1 text-[0.5em] font-semibold text-ink-400"
            />
          </div>
          <p className="text-right text-[11.5px] leading-tight text-ink-400">
            Projected
            <br />
            <span className="num text-[13px] font-semibold text-ink-700">
              {joinQuantity(formatEnergy(s.projectedKwh))}
            </span>
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-brand-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600 transition-[width] duration-1000"
            style={{ width: `${Math.min(100, todayProgress * 100)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-brand-100/70 pt-3 text-[12px]">
          <div>
            <p className="text-ink-400">Last 30 days</p>
            <p className="num mt-0.5 text-[13.5px] font-bold text-ink-900">
              {joinQuantity(formatMwh(s.last30DaysMwh))}
            </p>
          </div>
          <div>
            <p className="text-ink-400">Lifetime</p>
            <p className="num mt-0.5 text-[13.5px] font-bold text-ink-900">
              {joinQuantity(formatMwh(s.lifetimeMwh))}
            </p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Perf. ratio" value={percent(s.pr, 1)} />
        <Kpi label="Yield" value={s.specificYield.toFixed(2)} unit="kWh/kWp" />
        <Kpi label="Capacity" value={percent(s.capacityFactor, 1)} />
        <Kpi label="Efficiency" value={percent(s.efficiency, 1)} />
        <Kpi label="Irradiance" value={String(Math.round(s.poa))} unit="W/m²" />
        <Kpi label="Module temp" value={s.moduleTempC.toFixed(0)} unit="°C" />
        <Kpi label="Inverter" value={percent(s.inverterEfficiency, 1)} />
        <Kpi label="Availability" value={`${config.availability.toFixed(1)}`} unit="%" />
      </div>

      {/* Equipment */}
      <section aria-label={`${config.name} configuration`} className="mt-4">
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Configuration</p>
        <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 px-3.5 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-inset ring-brand-100">
            <Layers className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink-900">
              {config.technology.name}
              {needsBifacialTag(config.technology) && (
                <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                  Bifacial
                </span>
              )}
            </p>
            <p className="truncate text-[11.5px] text-ink-400">{config.technology.cell}</p>
          </div>
          <p className="num shrink-0 text-right text-[12px] leading-tight text-ink-400">
            <span className="block text-[14px] font-bold text-ink-900">{config.moduleWp} Wp</span>
            {percent(config.technology.efficiency, 1)} eff.
          </p>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Spec label="Modules" value={config.modules.toLocaleString("en-US")} sub={`${config.moduleWp} Wp each`} />
          <Spec
            label="Strings"
            value={String(config.stringCount)}
            sub={`× ${config.modulesPerString} modules`}
          />
          <Spec
            label="Inverters"
            value={formatInverters(config.inverters)}
            sub={`${config.inverters.kind} · DC/AC ${config.dcAcRatio.toFixed(2)}`}
          />
        </div>
      </section>

      <footer className="mt-4 flex items-center justify-between gap-3 text-[12px]">
        {notOnline && config.statusNote ? (
          <p
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium",
              config.status === "warning" ? "bg-amber-50 text-amber-700" : "bg-ink-100 text-ink-600",
            )}
          >
            {config.status === "warning" ? (
              <AlertTriangle className="size-3.5 shrink-0" />
            ) : (
              <Wrench className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{config.statusNote}</span>
          </p>
        ) : (
          <p className="truncate text-ink-400">Commissioned {config.commissioned}</p>
        )}
        <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">
          Chart
          <ArrowUpRight className="size-3.5" />
        </span>
      </footer>
    </article>
  );
});
