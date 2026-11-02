"use client";

import { useCallback, useRef, useState } from "react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { Comparison } from "./comparison";
import { Configuration } from "./configuration";
import { ProductionChart, type ChartMode, type Selection } from "./production-chart";
import { SummaryRow } from "./summary-row";
import { SystemCard } from "./system-card";

export function ProductionView() {
  const { snapshot, minute } = useLive();
  const [selection, setSelection] = useState<Selection>("all");
  const [mode, setMode] = useState<ChartMode>("power");
  const chartRef = useRef<HTMLDivElement>(null);
  const nowStep = Math.floor(minute / 10);

  const select = useCallback((id: Selection) => {
    setSelection(id);
  }, []);

  const focusSystem = useCallback((id: Selection) => {
    setSelection((current) => (current === id ? "all" : id));
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="space-y-6">
      <SummaryRow />

      <div ref={chartRef} className="scroll-mt-24">
        <ProductionChart
          selection={selection}
          onSelect={select}
          mode={mode}
          onModeChange={setMode}
          className="enter [animation-delay:280ms]"
        />
      </div>

      <section aria-labelledby="systems-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <h2 id="systems-heading" className="font-display text-[18px] font-semibold text-ink-900">
              PV systems
            </h2>
            <p className="text-[13px] text-ink-400">
              {PV_SYSTEMS.length} systems · select one to inspect its curve above
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {PV_SYSTEMS.map((cfg, i) => (
            <SystemCard
              key={cfg.id}
              config={cfg}
              index={i}
              snapshot={snapshot.systems[i]}
              nowStep={nowStep}
              selected={selection === cfg.id}
              onSelect={() => focusSystem(cfg.id)}
              delayMs={320 + i * 60}
            />
          ))}
        </div>
      </section>

      <Comparison className="enter [animation-delay:200ms]" />
      <Configuration className="enter [animation-delay:240ms]" />
    </div>
  );
}
