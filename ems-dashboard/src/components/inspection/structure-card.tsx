"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Cpu, Network } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { moduleLabel, moduleLayout, stringLabel, type ModuleRef } from "@/lib/soiling";
import {
  ANOMALY_KINDS,
  SEVERITY_LABEL,
  anomalyAt,
  getInspection,
  healthyTempC,
  severityRank,
  type Anomaly,
} from "@/lib/inspection";
import { CELL_TONE, cellLayout } from "@/lib/module-layout";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { ironbowCss, thermalRange } from "./ironbow";
import { ANOMALY_ICON, SEVERITIES, SEVERITY_COLOR, formatDelta, formatLoss } from "./levels";

type TileView = "modules" | "thermal";

export function StructureCard({
  index,
  selected,
  onSelect,
  className,
}: {
  index: number;
  selected: ModuleRef;
  onSelect: (ref: ModuleRef) => void;
  className?: string;
}) {
  const cfg = PV_SYSTEMS[index];
  const layout = moduleLayout(cfg);
  const inspection = getInspection(index);
  const tech = cfg.technology.short;
  const thinFilm = tech === "CdTe";
  const [inverter, setInverter] = useState(selected.inverter);
  const [view, setView] = useState<TileView>("modules");
  // Follow the selection when it moves to another inverter (e.g. from the anomaly register).
  const [prevSelected, setPrevSelected] = useState(selected);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    if (selected.inverter !== inverter) setInverter(selected.inverter);
  }

  const range = useMemo(() => {
    const hottest = inspection.anomalies.reduce((m, a) => Math.max(m, a.maxTempC), 0);
    return thermalRange(inspection.refTempC, hottest);
  }, [inspection]);

  const perInverter = useMemo(
    () =>
      Array.from({ length: layout.inverters }, (_, k) => {
        const list = inspection.anomalies.filter((a) => a.ref.inverter === k);
        const worst = list.reduce<Anomaly | null>(
          (w, a) => (!w || severityRank(a.severity) > severityRank(w.severity) ? a : w),
          null,
        );
        return { count: list.length, worst };
      }),
    [inspection, layout.inverters],
  );

  const strings = useMemo(
    () =>
      Array.from({ length: layout.stringsPerInverter }, (_, s) =>
        Array.from({ length: layout.modulesPerString }, (_, m) => {
          const ref = { inverter, string: s, module: m };
          return { ref, anomaly: anomalyAt(index, ref), temp: healthyTempC(index, ref) };
        }),
      ),
    [index, inverter, layout.stringsPerInverter, layout.modulesPerString],
  );

  // Bring the selected string into view inside the list (without scrolling the page).
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = list.current;
    if (!box || selected.inverter !== inverter) return;
    const row = box.children[selected.string] as HTMLElement | undefined;
    if (!row) return;
    const top = row.offsetTop;
    if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTo({ top: top - box.clientHeight / 2 + row.offsetHeight / 2, behavior: "smooth" });
  }, [selected, inverter]);

  const cellMax = thinFilm ? 56 : 30;
  const tone = CELL_TONE[cellLayout(tech).style];
  const offline = inspection.offlineInverters.includes(inverter);

  const inverterList = inspection.anomalies.filter((a) => a.ref.inverter === inverter);
  const counts = SEVERITIES.map((s) => ({ s, n: inverterList.filter((a) => a.severity === s).length }));

  return (
    <Card className={cn("flex flex-col", className)} fill>
      <CardHeader
        title="Inspected structure"
        subtitle={`${cfg.name} · ${cfg.modules} modules · ${inspection.anomalies.length} anomalies`}
        icon={<Network className="size-5" />}
        action={
          <div className="flex rounded-xl border border-line bg-ink-50/60 p-0.5" role="group" aria-label="Tile view">
            {(["modules", "thermal"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold capitalize transition",
                  view === v ? "bg-white text-brand-700 shadow-soft" : "text-ink-500 hover:text-ink-800",
                )}
              >
                {v === "modules" ? "Modules" : "Thermal"}
              </button>
            ))}
          </div>
        }
      />

      {/* Hierarchy */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
        <span className="rounded-full bg-ink-50 px-2.5 py-1 text-ink-700 ring-1 ring-inset ring-ink-200">{cfg.short}</span>
        <ChevronRight className="size-3.5 text-ink-300" />
        <span className="rounded-full bg-ink-50 px-2.5 py-1 text-ink-700 ring-1 ring-inset ring-ink-200">
          {layout.inverters} × {cfg.inverters.ratedKw} kW inverters
        </span>
        <ChevronRight className="size-3.5 text-ink-300" />
        <span className="rounded-full bg-ink-50 px-2.5 py-1 text-ink-700 ring-1 ring-inset ring-ink-200">
          {layout.stringsPerInverter} strings each
        </span>
        <ChevronRight className="size-3.5 text-ink-300" />
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700 ring-1 ring-inset ring-brand-200">
          {layout.modulesPerString} × {tech} {cfg.moduleWp} Wp per string
        </span>
      </div>

      {/* Inverters */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Inverters">
        {perInverter.map((inv, k) => {
          const on = k === inverter;
          const off = inspection.offlineInverters.includes(k);
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setInverter(k)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
                on ? "border-brand-300 bg-brand-50/70 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200",
              )}
            >
              <Cpu className={cn("size-4", on ? "text-brand-600" : "text-ink-400")} />
              <span className="leading-tight">
                <span className="block text-[12.5px] font-semibold text-ink-800">INV {k + 1}</span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: inv.worst ? SEVERITY_COLOR[inv.worst.severity] : "#10b981" }}
                >
                  {inv.count ? `${inv.count} anomal${inv.count > 1 ? "ies" : "y"}` : "No anomaly"}
                  {off && <span className="ml-1 text-ink-400">· offline</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {offline && (
        <p className="mb-3 rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] font-medium text-ink-600 ring-1 ring-inset ring-ink-200">
          This inverter was offline during the flight: its strings ran in open circuit, so they look uniformly warmer.
        </p>
      )}

      {/* Strings → modules */}
      <div ref={list} className="relative max-h-[380px] shrink-0 space-y-1.5 overflow-y-auto py-1 pl-1 pr-1">
        {strings.map((row, s) => {
          const n = row.filter((m) => m.anomaly).length;
          return (
            <div key={s} className="flex items-center gap-2.5">
              <span className="w-11 shrink-0 font-mono text-[11px] font-semibold text-ink-500">{stringLabel(inverter, s)}</span>
              <div
                className="grid flex-1 gap-[4px]"
                style={{ gridTemplateColumns: `repeat(${layout.modulesPerString}, minmax(0, ${cellMax}px))` }}
              >
                {row.map(({ ref, anomaly, temp }) => {
                  const on = selected.inverter === inverter && selected.string === ref.string && selected.module === ref.module;
                  const t = anomaly ? anomaly.maxTempC : temp + (offline ? 4 : 0);
                  const sev = anomaly ? SEVERITY_COLOR[anomaly.severity] : null;
                  return (
                    <button
                      key={ref.module}
                      type="button"
                      onClick={() => onSelect(ref)}
                      title={`${moduleLabel(ref)}${anomaly ? ` — ${anomaly.id} · ${SEVERITY_LABEL[anomaly.severity]}` : " — no anomaly"}`}
                      aria-label={`${moduleLabel(ref)}${anomaly ? `, ${SEVERITY_LABEL[anomaly.severity]} anomaly` : ""}`}
                      aria-pressed={on}
                      className={cn(
                        "relative rounded-[3px] transition-transform duration-150 hover:z-10 hover:scale-[1.18]",
                        thinFilm ? "aspect-[2/1]" : "aspect-[5/8]",
                        !sev && "ring-1 ring-inset ring-black/10",
                        on && "z-10 scale-[1.22] outline outline-2 outline-offset-2 outline-ink-900",
                      )}
                      style={{
                        background: view === "thermal" ? ironbowCss((t - range.min) / (range.max - range.min)) : tone,
                        boxShadow: sev ? `0 0 0 2px ${sev}, 0 0 8px ${sev}88` : undefined,
                      }}
                    />
                  );
                })}
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-400">
                {n > 0 && <span className="text-brand-700">{n}</span>}
              </span>
            </div>
          );
        })}
      </div>

      {/* Flagged modules on this inverter */}
      <div className="mt-4 flex min-h-[180px] flex-1 flex-col">
        <p className="mb-2 flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
          <span>Flagged on INV {inverter + 1}</span>
          <span className="normal-case tracking-normal">most severe first</span>
        </p>
        <div className="relative flex-1">
          <div className="max-h-[260px] space-y-1 overflow-y-auto pr-1 xl:absolute xl:inset-0 xl:max-h-none">
            {inverterList.length === 0 && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[12px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                No anomaly on this inverter — every module is within a few kelvin of its neighbours.
              </p>
            )}
            {inverterList.map((a) => {
              const on =
                selected.inverter === a.ref.inverter && selected.string === a.ref.string && selected.module === a.ref.module;
              const Icon = ANOMALY_ICON[a.type];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(a.ref)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] transition",
                    on ? "bg-brand-50 ring-1 ring-inset ring-brand-200" : "hover:bg-ink-50",
                  )}
                >
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: SEVERITY_COLOR[a.severity] }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-semibold text-ink-800">{ANOMALY_KINDS[a.type].label}</span>
                    <span className="font-mono text-[10.5px] text-ink-400">
                      {stringLabel(a.ref.inverter, a.ref.string)} · M{a.ref.module + 1}
                    </span>
                  </span>
                  <span className="shrink-0 text-right leading-tight tabular-nums">
                    <span className="block font-semibold text-ink-800">{formatDelta(a.deltaT)}</span>
                    <span className="text-[10.5px] text-ink-400">−{formatLoss(a.loss)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inverter summary + legend */}
      <div className="pt-4">
        <div className="grid grid-cols-4 gap-2">
          {counts.map(({ s, n }) => (
            <div key={s} className="rounded-2xl bg-ink-50/60 px-3 py-2 ring-1 ring-inset ring-line">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
                {SEVERITY_LABEL[s]}
              </p>
              <p className="font-display mt-0.5 text-[17px] font-bold tabular-nums text-ink-900">{n}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-3 text-[11.5px] font-semibold text-ink-500">
          <span className="flex items-center gap-2">
            <span className="h-4 w-2.5 rounded-[2px]" style={{ background: tone, boxShadow: `0 0 0 2px ${SEVERITY_COLOR.high}` }} />
            Bordered = anomaly, coloured by severity
          </span>
          <span className="ml-auto text-ink-400">INV {inverter + 1} · click a module to inspect it</span>
        </div>
      </div>
    </Card>
  );
}
