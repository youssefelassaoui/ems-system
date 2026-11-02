"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Bird, Eye, Move3d, Sparkles } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import {
  CLEAN_THRESHOLD,
  LEVEL_LABEL,
  SCALE_MAX,
  dustCoverage,
  moduleLabel,
  soilingLevel,
  type ModuleRef,
  type ModuleSoiling,
} from "@/lib/soiling";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { LEVEL_COLOR } from "./levels";

function SceneLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-14">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-300/50" />
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow" />
        </div>
        <p className="text-[12.5px] font-semibold text-ink-500">Loading module…</p>
      </div>
    </div>
  );
}

const PanelScene = dynamic(() => import("./panel-scene"), { ssr: false, loading: () => <SceneLoader /> });

export function PanelCard({
  index,
  module: ref,
  soiling,
  modulePowerW,
  className,
}: {
  index: number;
  module: ModuleRef;
  soiling: ModuleSoiling;
  /** Present output of one module of this system, W. */
  modulePowerW: number;
  className?: string;
}) {
  const cfg = PV_SYSTEMS[index];
  const [clean, setClean] = useState(false);
  const [active, setActive] = useState(true);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The dust drawing only changes with visible steps of soiling (0.1 %), not every simulated minute.
  const drawnLoss = Math.round(soiling.loss * 1000) / 1000;
  const level = soilingLevel(soiling.loss);
  const lostW = (modulePowerW * soiling.loss) / (1 - soiling.loss);
  const seed = ((index + 1) * 1000 + ref.inverter * 97 + ref.string * 13 + ref.module) | 0;
  const marker = Math.min(1, soiling.loss / SCALE_MAX) * 100;

  return (
    <Card padded={false} fill className={className}>
      <div ref={holder} className="relative isolate h-[540px] overflow-hidden sm:h-[560px] xl:h-auto xl:min-h-[640px] xl:flex-1">
        {/* Desert-sky backdrop */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_50%_25%,#ffffff_0%,#fbf5ea_50%,#efe0c6_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-[#e8d3ad]/70 to-transparent" />

        <PanelScene
          technology={cfg.technology.short}
          bifacial={cfg.technology.bifacial}
          coverage={dustCoverage(drawnLoss)}
          hotspot={soiling.hotspot}
          seed={seed}
          clean={clean}
          active={active}
        />

        {/* Module identity */}
        <div className="pointer-events-none absolute left-5 top-5 z-10 sm:left-7 sm:top-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700 shadow-soft backdrop-blur-xl">
            Selected module
          </span>
          <h2 className="font-display mt-3 text-[20px] font-bold leading-tight text-ink-900 sm:text-[24px]">
            {moduleLabel(ref)}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {cfg.name} · {cfg.technology.name} · {cfg.moduleWp} Wp
          </p>
        </div>

        {/* Soiling of this module */}
        <div className="absolute left-5 top-[118px] z-10 flex items-center gap-3 rounded-2xl border border-line bg-white/90 px-3.5 py-2.5 shadow-soft backdrop-blur-xl sm:left-auto sm:right-6 sm:top-6 sm:block sm:w-[220px] sm:rounded-3xl sm:p-4">
          <p className="hidden text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400 sm:block">Soiling loss</p>
          <p className="font-display text-[26px] font-bold leading-none tracking-tight text-ink-900 sm:mt-1 sm:text-[36px]">
            {(soiling.loss * 100).toFixed(1)}
            <span className="ml-1 text-[0.45em] font-semibold text-ink-400">%</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-bold sm:mt-2" style={{ color: LEVEL_COLOR[level] }}>
            <span className="size-2 rounded-full bg-current" />
            {LEVEL_LABEL[level]}
          </p>
          <dl className="mt-3 hidden space-y-1.5 border-t border-line/70 pt-3 text-[12px] sm:block">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Lost now</dt>
              <dd className="font-semibold tabular-nums text-ink-800">{lostW >= 0.5 ? `−${lostW.toFixed(0)} W` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">Module output</dt>
              <dd className="font-semibold tabular-nums text-ink-800">{modulePowerW.toFixed(0)} W</dd>
            </div>
          </dl>
          {soiling.hotspot && (
            <p className="mt-3 hidden items-start gap-1.5 rounded-xl bg-amber-50 sm:flex px-2.5 py-2 text-[11.5px] font-semibold leading-snug text-amber-800 ring-1 ring-inset ring-amber-200">
              <Bird className="mt-px size-3.5 shrink-0" />
              Bird droppings — local hotspot risk
            </p>
          )}
        </div>

        {/* Bottom: scale + controls */}
        <div className="absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-3 sm:inset-x-6 sm:bottom-5">
          <div className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 shadow-soft backdrop-blur-xl sm:w-[340px]">
            <div className="relative h-2 rounded-full bg-[linear-gradient(90deg,#10b981_0%,#d4a95a_25%,#c27a2c_41%,#b4441f_70%,#7a2a12_100%)]">
              <span
                className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-ink-900/40"
                style={{ left: `${(CLEAN_THRESHOLD / SCALE_MAX) * 100}%` }}
              />
              <span
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.3)] transition-[left] duration-700"
                style={{ left: `${marker}%`, background: LEVEL_COLOR[level] }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-ink-400">
              <span>0 %</span>
              <span>Clean at {(CLEAN_THRESHOLD * 100).toFixed(0)} %</span>
              <span>{(SCALE_MAX * 100).toFixed(0)} %+</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-line bg-white/90 px-3 py-2.5 text-[12px] font-semibold text-ink-500 shadow-soft backdrop-blur-xl md:flex">
              <Move3d className="size-4 text-brand-600" />
              Drag to rotate
            </div>
            <div className="flex rounded-2xl border border-line bg-white/90 p-1 shadow-soft backdrop-blur-xl" role="group" aria-label="View">
              {[
                { on: !clean, label: "As measured", icon: Eye, value: false },
                { on: clean, label: "Clean preview", icon: Sparkles, value: true },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  aria-pressed={b.on}
                  onClick={() => setClean(b.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition",
                    b.on ? "bg-brand-600 text-white shadow-soft" : "text-ink-600 hover:text-brand-700",
                  )}
                >
                  <b.icon className="size-3.5" />
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
