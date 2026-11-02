"use client";

import { useState } from "react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { typicalModule, getModuleSoiling, type ModuleRef } from "@/lib/soiling";
import { CleaningPlan } from "./cleaning-plan";
import { PanelCard } from "./panel-card";
import { SoilingChart } from "./soiling-chart";
import { StructureCard } from "./structure-card";
import { SoilingSummary } from "./summary-row";
import { SystemChips } from "./system-chips";
import { useSoiling } from "./use-soiling";

export function SoilingView() {
  const { snapshot } = useLive();
  const soiling = useSoiling();
  const [selection, setSelection] = useState<{ index: number; module: ModuleRef }>(() => ({
    index: 0,
    module: typicalModule(0),
  }));
  const { index, module } = selection;

  const selectSystem = (i: number) => setSelection({ index: i, module: typicalModule(i) });
  const system = soiling.systems[index];
  const cfg = PV_SYSTEMS[index];
  const moduleSoiling = getModuleSoiling(index, module, system.loss);
  const modulePowerW = (snapshot.systems[index].powerKw * 1000) / cfg.modules;

  return (
    <div className="space-y-6">
      <SoilingSummary />

      <SystemChips systems={soiling.systems} selected={index} onSelect={selectSystem} />

      <div className="grid gap-6 xl:grid-cols-12">
        <StructureCard
          key={cfg.id}
          index={index}
          systemLoss={system.loss}
          selected={module}
          onSelect={(ref) => setSelection({ index, module: ref })}
          className="enter xl:col-span-5"
        />
        <PanelCard
          index={index}
          module={module}
          soiling={moduleSoiling}
          modulePowerW={modulePowerW}
          className="enter xl:col-span-7"
        />
      </div>

      <SoilingChart index={index} system={system} fleetHistory={soiling.fleetHistory} module={module} />

      <CleaningPlan systems={soiling.systems} lostToday={soiling.lostToday} selected={index} onSelect={selectSystem} />
    </div>
  );
}
