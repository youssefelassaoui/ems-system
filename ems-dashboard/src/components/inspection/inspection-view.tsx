"use client";

import { useState } from "react";
import { useLive } from "@/providers/live-provider";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import type { ModuleRef } from "@/lib/soiling";
import { MISSION, anomalyAt, getInspection, severityRank } from "@/lib/inspection";
import { AnomalyCard } from "./anomaly-card";
import { AnomalyRegister } from "./anomaly-register";
import type { InspectionMode } from "./inspection-scene";
import { MissionCard } from "./mission-card";
import { ModuleCard } from "./module-card";
import { StructureCard } from "./structure-card";
import { InspectionSummary } from "./summary-row";
import { SystemChips } from "./system-chips";

/** The worst anomaly of a system (or its first module when it has none). */
function firstModule(index: number): ModuleRef {
  return getInspection(index).anomalies[0]?.ref ?? { inverter: 0, string: 0, module: 0 };
}

/** Starts on the system whose worst anomaly is the most severe. */
function initialSystem() {
  let best = 0;
  PV_SYSTEMS.forEach((_, i) => {
    const a = getInspection(i).anomalies[0];
    const b = getInspection(best).anomalies[0];
    if (a && (!b || severityRank(a.severity) > severityRank(b.severity) || (a.severity === b.severity && a.deltaT > b.deltaT)))
      best = i;
  });
  return best;
}

function flightLabel(dateISO: string) {
  const d = new Date(`${dateISO}T12:00:00`);
  d.setDate(d.getDate() - MISSION.daysAgo);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function InspectionView() {
  const { snapshot, dateISO } = useLive();
  const [selection, setSelection] = useState(() => {
    const index = initialSystem();
    return { index, module: firstModule(index) };
  });
  const [mode, setMode] = useState<InspectionMode>("thermal");
  const { index, module } = selection;
  const cfg = PV_SYSTEMS[index];
  const anomaly = anomalyAt(index, module);
  const modulePowerW = (snapshot.systems[index].powerKw * 1000) / cfg.modules;
  const flightDate = flightLabel(dateISO);

  const selectSystem = (i: number) => setSelection({ index: i, module: firstModule(i) });
  const selectModule = (ref: ModuleRef) => setSelection({ index, module: ref });

  return (
    <div className="space-y-6">
      <InspectionSummary flightDate={flightDate} />

      <MissionCard flightDate={flightDate} />

      <SystemChips selected={index} onSelect={selectSystem} />

      <div className="grid gap-6 xl:grid-cols-12">
        <StructureCard
          key={cfg.id}
          index={index}
          selected={module}
          onSelect={selectModule}
          className="enter xl:col-span-5 xl:row-span-2"
        />
        <ModuleCard
          index={index}
          module={module}
          anomaly={anomaly}
          mode={mode}
          onMode={setMode}
          flightDate={flightDate}
          className="enter xl:col-span-7"
        />
        <AnomalyCard
          index={index}
          module={module}
          anomaly={anomaly}
          modulePowerW={modulePowerW}
          className="enter xl:col-span-7"
        />
      </div>

      <AnomalyRegister index={index} selected={module} onSelect={selectModule} />
    </div>
  );
}
