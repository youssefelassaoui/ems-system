"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Cpu, Network } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import {
  SCALE_MAX,
  getModuleSoiling,
  inverterSoiling,
  moduleLabel,
  moduleLayout,
  stringLabel,
  type ModuleRef,
} from "@/lib/soiling";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { levelColor, moduleTileBackground, pct } from "./levels";

export function StructureCard({
  index,
  systemLoss,
  selected,
  onSelect,
  className,
}: {
  index: number;
  systemLoss: number;
  selected: ModuleRef;
  onSelect: (ref: ModuleRef) => void;
  className?: string;
}) {
  const cfg = PV_SYSTEMS[index];
  const layout = moduleLayout(cfg);
  const tech = cfg.technology.short;
  const [inverter, setInverter] = useState(selected.inverter);
  const thinFilm = tech === "CdTe";

  // Soiling moves slowly — round to 0.01 % so the map is not rebuilt every simulated minute.
  const loss = Math.round(systemLoss * 1e4) / 1e4;

  const inverters = useMemo(
    () => Array.from({ length: layout.inverters }, (_, k) => inverterSoiling(index, k, loss)),
    [index, layout.inverters, loss],
  );

  const strings = useMemo(
    () =>
      Array.from({ length: layout.stringsPerInverter }, (_, s) => {
        const modules = Array.from({ length: layout.modulesPerString }, (_, m) =>
          getModuleSoiling(index, { inverter, string: s, module: m }, loss),
        );
        return { modules, mean: modules.reduce((a, v) => a + v.loss, 0) / modules.length };
      }),
    [index, inverter, layout.stringsPerInverter, layout.modulesPerString, loss],
  );

  const cellMax = thinFilm ? 56 : 30;

  const selectedString = useMemo(() => {
    const mods = Array.from({ length: layout.modulesPerString }, (_, m) =>
      getModuleSoiling(index, { inverter: selected.inverter, string: selected.string, module: m }, loss).loss,
    );
    return { mean: mods.reduce((a, v) => a + v, 0) / mods.length, worst: Math.max(...mods) };
  }, [index, selected.inverter, selected.string, layout.modulesPerString, loss]);

  const hotspots = useMemo(() => {
    let n = 0;
    for (let k = 0; k < layout.inverters; k++)
      for (let s = 0; s < layout.stringsPerInverter; s++)
        for (let m = 0; m < layout.modulesPerString; m++)
          if (getModuleSoiling(index, { inverter: k, string: s, module: m }, 0).hotspot) n++;
    return n;
  }, [index, layout.inverters, layout.stringsPerInverter, layout.modulesPerString]);

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

  return (
    <Card className={cn("flex flex-col", className)} fill>
      <CardHeader
        title="System structure"
        subtitle={`${cfg.name} · ${layout.inverters} inverters · ${cfg.stringCount} strings · ${cfg.modules} modules`}
        icon={<Network className="size-5" />}
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
        {inverters.map((l, k) => {
          const on = k === inverter;
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
                <span className="text-[11px] font-semibold" style={{ color: levelColor(l) }}>
                  {pct(l)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Strings → modules */}
      <div className="relative min-h-0">
        <div ref={list} className="relative max-h-[400px] space-y-1.5 overflow-y-auto pr-1">
          {strings.map((row, s) => (
            <div key={s} className="flex items-center gap-2.5">
              <span className="w-11 shrink-0 font-mono text-[11px] font-semibold text-ink-500">
                {stringLabel(inverter, s)}
              </span>
              <div
                className="grid flex-1 gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${layout.modulesPerString}, minmax(0, ${cellMax}px))`,
                }}
              >
                {row.modules.map((mod, m) => {
                  const ref = { inverter, string: s, module: m };
                  const on = selected.inverter === inverter && selected.string === s && selected.module === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelect(ref)}
                      title={`${moduleLabel(ref)} — ${pct(mod.loss)}${mod.hotspot ? " · bird droppings" : ""}`}
                      aria-label={`${moduleLabel(ref)}, soiling ${pct(mod.loss)}`}
                      aria-pressed={on}
                      className={cn(
                        "relative rounded-[3px] ring-1 ring-inset ring-black/10 transition-transform duration-150 hover:z-10 hover:scale-[1.18]",
                        thinFilm ? "aspect-[2/1]" : "aspect-[5/8]",
                        on && "z-10 scale-[1.18] outline outline-2 outline-offset-1 outline-brand-500",
                      )}
                      style={{ background: moduleTileBackground(tech, mod.loss) }}
                    >
                      {mod.hotspot && (
                        <span className="absolute left-1/2 top-1/3 size-[5px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums" style={{ color: levelColor(row.mean) }}>
                {pct(row.mean)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected string */}
      {selectedString && (
        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          {[
            { label: `String ${stringLabel(selected.inverter, selected.string)}`, value: pct(selectedString.mean), color: levelColor(selectedString.mean) },
            { label: "Dirtiest module", value: pct(selectedString.worst), color: levelColor(selectedString.worst) },
            { label: "Bird droppings", value: `${hotspots} in ${cfg.short}`, color: undefined },
          ].map((t) => (
            <div key={t.label} className="rounded-2xl bg-brand-50/60 px-3 py-2.5 ring-1 ring-inset ring-brand-100">
              <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">{t.label}</p>
              <p className="font-display mt-0.5 text-[17px] font-bold tabular-nums text-ink-900" style={t.color ? { color: t.color } : undefined}>
                {t.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line/70 pt-3.5 text-[11.5px] font-semibold text-ink-500">
        <span className="flex items-center gap-2">
          <span className="flex gap-[2px]">
            {[0, 0.02, 0.04, 0.07, SCALE_MAX].map((l) => (
              <span key={l} className="h-4 w-2.5 rounded-[2px]" style={{ background: moduleTileBackground(tech, l) }} />
            ))}
          </span>
          0 → {(SCALE_MAX * 100).toFixed(0)} %+ soiling
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative h-4 w-2.5 rounded-[2px]" style={{ background: moduleTileBackground(tech, 0.02) }}>
            <span className="absolute left-1/2 top-1/3 size-[5px] -translate-x-1/2 rounded-full bg-white" />
          </span>
          Bird droppings
        </span>
        <span className="ml-auto text-ink-400">Click a module to inspect it</span>
      </div>
    </Card>
  );
}
