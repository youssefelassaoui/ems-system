"use client";

import type { ReactNode } from "react";
import { CircleCheck, Eye, EyeOff, ShieldAlert, Wrench } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { moduleLabel, type ModuleRef } from "@/lib/soiling";
import { ANOMALY_KINDS, MISSION, SEVERITY_LABEL, getInspection, healthyTempC, type Anomaly } from "@/lib/inspection";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { ANOMALY_ICON, SEVERITY_COLOR, formatDelta, formatTemp } from "./levels";

function Metric({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl bg-ink-50/60 px-3.5 py-3 ring-1 ring-inset ring-line">
      <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</p>
      <p className="font-display mt-0.5 truncate text-[18px] font-bold tabular-nums text-ink-900" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="truncate text-[11.5px] text-ink-500">{sub}</p>}
    </div>
  );
}

function affected(a: Anomaly) {
  switch (a.type) {
    case "diode":
      return { value: `Substring ${(a.substring ?? 0) + 1} of 3`, sub: a.cells ? `${a.cells} cells bypassed` : "one third of the module" };
    case "junctionBox":
      return { value: "Junction box", sub: "rear, top edge" };
    case "offline":
      return { value: "Whole module", sub: a.totalCells ? `${a.totalCells} cells` : "entire absorber" };
    default:
      return a.cells
        ? { value: `${a.cells} of ${a.totalCells} cells`, sub: a.cells === 1 ? "single cell" : "scattered cells" }
        : { value: "Local area", sub: "thin film, no cells" };
  }
}

export function AnomalyCard({
  index,
  module: ref,
  anomaly,
  modulePowerW,
  className,
}: {
  index: number;
  module: ModuleRef;
  anomaly: Anomaly | null;
  /** Present output of a healthy module of this system, W. */
  modulePowerW: number;
  className?: string;
}) {
  const cfg = PV_SYSTEMS[index];

  if (!anomaly) {
    const t = healthyTempC(index, ref);
    const inspection = getInspection(index);
    return (
      <Card className={className}>
        <CardHeader
          title="No anomaly on this module"
          subtitle={`${moduleLabel(ref)} · scanned on flight ${MISSION.id}`}
          icon={<CircleCheck className="size-5 text-emerald-600" />}
        />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Metric label="Module temperature" value={formatTemp(t)} sub="uniform across the cells" />
          <Metric
            label="Vs healthy modules"
            value={`${t - inspection.refTempC >= 0 ? "+" : "−"}${Math.abs(t - inspection.refTempC).toFixed(1)} K`}
            sub={`reference ${formatTemp(inspection.refTempC)}`}
          />
          <Metric label="Output now" value={`${modulePowerW.toFixed(0)} W`} sub="as expected" />
          <Metric
            label="Anomalies in system"
            value={inspection.anomalies.length}
            sub="bordered modules on the map"
          />
        </div>
      </Card>
    );
  }

  const kind = ANOMALY_KINDS[anomaly.type];
  const Icon = ANOMALY_ICON[anomaly.type];
  const color = SEVERITY_COLOR[anomaly.severity];
  const where = affected(anomaly);
  const lossNowW = modulePowerW * anomaly.loss;

  return (
    <Card className={className}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl text-white shadow-soft" style={{ background: color }}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display truncate text-[16px] font-semibold text-ink-900">{kind.label}</h3>
            <p className="truncate text-[12.5px] text-ink-400">
              {anomaly.id} · {cfg.short} · {moduleLabel(ref)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white"
            style={{ background: color }}
          >
            {SEVERITY_LABEL[anomaly.severity]} severity
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset",
              anomaly.iecClass === 3 ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-ink-50 text-ink-600 ring-ink-200",
            )}
            title="Class of abnormality, IEC TS 62446-3"
          >
            {anomaly.iecClass === 3 && <ShieldAlert className="size-3.5" />}
            CoA {anomaly.iecClass} · {anomaly.iecClass === 3 ? "safety relevant" : "thermal abnormality"}
          </span>
        </div>
      </header>

      <p className="mb-4 text-[13px] leading-relaxed text-ink-600">{kind.description}</p>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Metric label="Temperature rise" value={formatDelta(anomaly.deltaT)} sub="vs healthy modules" accent={color} />
        <Metric label="Hotspot" value={formatTemp(anomaly.maxTempC)} sub={`reference ${formatTemp(anomaly.refTempC)}`} />
        <Metric
          label="Power loss"
          value={`${(anomaly.loss * 100).toFixed(anomaly.loss < 0.1 ? 1 : 0)} %`}
          sub={`${anomaly.lossWp.toFixed(0)} W of ${cfg.moduleWp} Wp`}
        />
        <Metric label="Lost right now" value={lossNowW >= 0.5 ? `−${lossNowW.toFixed(0)} W` : "—"} sub="at present irradiance" />
        <Metric label="Energy lost / year" value={`≈ ${anomaly.annualKwh.toFixed(0)} kWh`} sub="if left unrepaired" />
        <Metric label="Affected" value={where.value} sub={where.sub} />
        <Metric label="Confidence" value={`${(anomaly.confidence * 100).toFixed(0)} %`} sub="automatic detection" />
        <Metric
          label="History"
          value={anomaly.flights === 1 ? "New" : `${anomaly.flights} flights`}
          sub={anomaly.flights === 1 ? "first seen on this flight" : "seen on previous flights too"}
        />
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-[1fr_auto]">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-50/70 px-4 py-3 ring-1 ring-inset ring-brand-100">
          <Wrench className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-brand-700/70">Recommended action</p>
            <p className="text-[13px] font-medium text-ink-800">{kind.action}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-ink-50/60 px-4 py-3 text-[12px] font-semibold text-ink-600 ring-1 ring-inset ring-line">
          {kind.visibleInRgb ? <Eye className="size-4 text-ink-500" /> : <EyeOff className="size-4 text-ink-400" />}
          {kind.visibleInRgb ? "Visible on the RGB photo" : "Thermal only — not visible on RGB"}
        </div>
      </div>
    </Card>
  );
}
