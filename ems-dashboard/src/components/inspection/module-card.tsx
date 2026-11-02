"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Move3d, Thermometer } from "lucide-react";
import { PV_SYSTEMS, TOTAL_MODULES } from "@/lib/pv-systems";
import { HISTORY_DAYS, dustCoverage, getModuleSoiling, getSystemSoiling, moduleLabel, type ModuleRef } from "@/lib/soiling";
import { ANOMALY_KINDS, MISSION, SEVERITY_LABEL, healthyTempC, moduleIndex, type Anomaly } from "@/lib/inspection";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import type { InspectionMode } from "./inspection-scene";
import { PALETTES, PALETTE_LABEL, paletteGradient, thermalRange, type ThermalPalette } from "./ironbow";
import { SEVERITY_COLOR, formatDelta, formatTemp } from "./levels";

/** Emissivity set on the camera for glass-covered modules. */
const EMISSIVITY = 0.85;

function SceneLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">Loading radiometric image…</p>
    </div>
  );
}

const InspectionScene = dynamic(() => import("./inspection-scene"), { ssr: false, loading: () => <SceneLoader /> });

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** When the drone imaged this module: systems are flown in order, module by module. */
function captureTime(index: number, ref: ModuleRef) {
  const before = PV_SYSTEMS.slice(0, index).reduce((s, c) => s + c.modules, 0);
  const share = (before + moduleIndex(PV_SYSTEMS[index], ref)) / TOTAL_MODULES;
  const start = toMinutes(MISSION.start) * 60;
  const total = (toMinutes(MISSION.end) - toMinutes(MISSION.start)) * 60;
  const s = Math.round(start + share * total);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** Viewfinder corners of the camera frame. */
function Viewfinder({ dark }: { dark: boolean }) {
  const line = dark ? "border-white/25" : "border-ink-900/15";
  return (
    <div className="pointer-events-none absolute inset-3 z-0 sm:inset-4">
      <span className={cn("absolute left-0 top-0 size-5 border-l-[1.5px] border-t-[1.5px]", line)} />
      <span className={cn("absolute right-0 top-0 size-5 border-r-[1.5px] border-t-[1.5px]", line)} />
      <span className={cn("absolute bottom-0 left-0 size-5 border-b-[1.5px] border-l-[1.5px]", line)} />
      <span className={cn("absolute bottom-0 right-0 size-5 border-b-[1.5px] border-r-[1.5px]", line)} />
    </div>
  );
}

/** Vertical temperature scale with the spot-meter readings, as in thermography software. */
function ScaleBar({
  palette,
  range,
  marks,
}: {
  palette: ThermalPalette;
  range: { min: number; max: number };
  marks: { label: string; t: number }[];
}) {
  const span = range.max - range.min;
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((k) => Math.round(range.min + span * k));
  const pos = (T: number) => Math.min(100, Math.max(0, ((T - range.min) / span) * 100));
  return (
    <div className="pointer-events-none absolute right-4 top-[132px] bottom-[132px] z-10 flex gap-2 sm:right-6 sm:top-[118px] sm:bottom-[118px]">
      <div className="relative w-9">
        {marks.map((m) => (
          <span
            key={m.label}
            className="absolute right-0 flex translate-y-1/2 items-center gap-1 font-mono text-[10px] font-semibold text-white"
            style={{ bottom: `${pos(m.t)}%` }}
          >
            {m.label}
            <span className="size-0 border-y-[4px] border-l-[5px] border-y-transparent border-l-white" />
          </span>
        ))}
      </div>
      <div
        className="w-2.5 rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
        style={{ background: paletteGradient(palette, "to top") }}
      />
      <div className="flex flex-col justify-between font-mono text-[10px] font-medium tabular-nums text-white/65">
        {ticks.map((t, i) => (
          <span key={i} className="-my-1.5 leading-3">
            {t}
            {i === 0 ? " °C" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Reading({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-white/55">
        {accent && <span className="size-2 rounded-[2px]" style={{ background: accent }} />}
        {label}
      </span>
      <span className="text-right font-semibold tabular-nums text-white">{value}</span>
    </>
  );
}

export function ModuleCard({
  index,
  module: ref,
  anomaly,
  mode,
  onMode,
  flightDate,
  className,
}: {
  index: number;
  module: ModuleRef;
  anomaly: Anomaly | null;
  mode: InspectionMode;
  onMode: (m: InspectionMode) => void;
  flightDate: string;
  className?: string;
}) {
  const cfg = PV_SYSTEMS[index];
  const [active, setActive] = useState(true);
  const [palette, setPalette] = useState<ThermalPalette>("ironbow");
  const holder = useRef<HTMLDivElement>(null);
  const thermal = mode === "thermal";

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const baseTempC = healthyTempC(index, ref);
  const maxTemp = anomaly?.maxTempC ?? baseTempC;
  const range = useMemo(() => thermalRange(baseTempC, maxTemp), [baseTempC, maxTemp]);
  // Dust as it was on the flight day (yesterday's close in the soiling model).
  const dust = useMemo(() => {
    const sys = getSystemSoiling(index, 0).history[HISTORY_DAYS - 2];
    return Math.round(dustCoverage(getModuleSoiling(index, ref, sys).loss) * 50) / 50;
  }, [index, ref]);
  const seed = (index + 1) * 1000 + ref.inverter * 97 + ref.string * 13 + ref.module;
  const color = anomaly ? SEVERITY_COLOR[anomaly.severity] : "#10b981";
  const time = captureTime(index, ref);

  return (
    <Card padded={false} fill className={className}>
      <div id="inspection-viewer" ref={holder} className="relative isolate h-[540px] overflow-hidden sm:h-[560px] xl:h-[600px]">
        {/* Backdrop: graphite for the thermal image, daylight for RGB */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_50%_25%,#ffffff_0%,#eef2f7_55%,#dfe5ee_100%)]" />
        <div
          className={cn(
            "absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_30%,#1d2027_0%,#111318_55%,#08090b_100%)] transition-opacity duration-500",
            thermal ? "opacity-100" : "opacity-0",
          )}
        />
        <Viewfinder dark={thermal} />

        <InspectionScene
          technology={cfg.technology.short}
          bifacial={cfg.technology.bifacial}
          anomaly={anomaly}
          baseTempC={baseTempC}
          range={range}
          palette={palette}
          dust={dust}
          seed={seed}
          mode={mode}
          markerColor={color}
          active={active}
        />

        {/* Capture and module identity */}
        <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-[calc(100%-3rem)] sm:left-8 sm:top-7">
          <p
            className={cn(
              "flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]",
              thermal ? "text-white/55" : "text-ink-400",
            )}
          >
            {thermal ? <Thermometer className="size-3.5" /> : <Camera className="size-3.5" />}
            {thermal ? "IR radiometric" : "RGB visual"}
            <span className="hidden sm:inline">
              · {MISSION.id} · {time}
            </span>
          </p>
          <h2
            className={cn(
              "font-display mt-2 text-[20px] font-bold leading-tight transition-colors sm:text-[24px]",
              thermal ? "text-white" : "text-ink-900",
            )}
          >
            {moduleLabel(ref)}
          </h2>
          <p className={cn("mt-0.5 text-[13px] transition-colors", thermal ? "text-white/55" : "text-ink-500")}>
            {cfg.name} · {cfg.technology.name} · {cfg.moduleWp} Wp
          </p>
          <span
            className={cn(
              "mt-3 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ring-inset backdrop-blur-md",
              thermal ? "bg-black/40 text-white ring-white/15" : "bg-white/85 text-ink-800 ring-ink-200",
            )}
          >
            <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
            {anomaly ? (
              <>
                {ANOMALY_KINDS[anomaly.type].short}
                <span className={thermal ? "text-white/45" : "text-ink-400"}>·</span>
                {SEVERITY_LABEL[anomaly.severity]}
              </>
            ) : (
              "No anomaly detected"
            )}
          </span>
        </div>

        {/* View switch and palette */}
        <div className="absolute right-4 top-5 z-10 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
          <div
            className={cn(
              "flex rounded-xl p-0.5 ring-1 ring-inset backdrop-blur-md",
              thermal ? "bg-black/40 ring-white/15" : "bg-white/85 ring-ink-200",
            )}
            role="group"
            aria-label="Camera"
          >
            {[
              { m: "thermal" as const, label: "Thermal", icon: Thermometer },
              { m: "rgb" as const, label: "RGB", icon: Camera },
            ].map((b) => (
              <button
                key={b.m}
                type="button"
                aria-pressed={mode === b.m}
                onClick={() => onMode(b.m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition",
                  mode === b.m
                    ? thermal
                      ? "bg-white text-ink-900"
                      : "bg-ink-900 text-white"
                    : thermal
                      ? "text-white/65 hover:text-white"
                      : "text-ink-500 hover:text-ink-900",
                )}
              >
                <b.icon className="size-3.5" />
                {b.label}
              </button>
            ))}
          </div>
          {thermal && (
            <div className="flex rounded-lg bg-black/40 p-0.5 ring-1 ring-inset ring-white/15 backdrop-blur-md" role="group" aria-label="Palette">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={palette === p}
                  onClick={() => setPalette(p)}
                  title={PALETTE_LABEL[p]}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition",
                    palette === p ? "bg-white/15 text-white" : "text-white/50 hover:text-white/85",
                  )}
                >
                  <span className="h-2 w-3 rounded-[2px]" style={{ background: paletteGradient(p) }} />
                  <span className="hidden sm:inline">{PALETTE_LABEL[p]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {thermal && (
          <ScaleBar
            palette={palette}
            range={range}
            marks={anomaly ? [{ label: "Sp1", t: maxTemp }, { label: "Sp2", t: baseTempC }] : [{ label: "Avg", t: baseTempC }]}
          />
        )}

        {/* Readings (thermal) or camera note (RGB) */}
        <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
          {thermal ? (
            <div className="w-full max-w-[300px] rounded-xl bg-black/45 px-3.5 py-3 font-mono text-[11.5px] ring-1 ring-inset ring-white/12 backdrop-blur-md">
              <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                {anomaly ? (
                  <>
                    <Reading label="Sp1 hotspot" value={formatTemp(maxTemp)} accent={color} />
                    <Reading label="Sp2 reference" value={formatTemp(baseTempC)} />
                    <Reading label="ΔT Sp1 − Sp2" value={formatDelta(anomaly.deltaT)} />
                  </>
                ) : (
                  <>
                    <Reading label="Module avg" value={formatTemp(baseTempC)} accent={color} />
                    <Reading label="Max ΔT" value="< 2.0 K" />
                  </>
                )}
              </div>
              <p className="mt-2 truncate border-t border-white/10 pt-2 text-[10px] text-white/45">
                ε {EMISSIVITY.toFixed(2)} · Amb {MISSION.ambientC} °C · {MISSION.altitudeM} m · {MISSION.irradiance} W/m²
              </p>
            </div>
          ) : (
            <div className="max-w-[340px] rounded-xl bg-white/85 px-3.5 py-2.5 text-[12px] font-medium text-ink-600 ring-1 ring-inset ring-ink-200 backdrop-blur-md">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                {MISSION.rgb} · {MISSION.gsdRgbCm} cm/px
              </p>
              <p className="mt-0.5">
                {anomaly
                  ? ANOMALY_KINDS[anomaly.type].visibleInRgb
                    ? "Defect visible on the photo."
                    : "Not visible on the photo: only the thermal camera sees it."
                  : "Module looks normal."}
              </p>
            </div>
          )}
          <div
            className={cn(
              "hidden shrink-0 items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] md:flex",
              thermal ? "text-white/45" : "text-ink-400",
            )}
          >
            <Move3d className="size-3.5" />
            Drag to rotate · {flightDate}
          </div>
        </div>
      </div>
    </Card>
  );
}
