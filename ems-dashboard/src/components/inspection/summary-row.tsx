"use client";

import { Drone, ScanEye, Thermometer, Zap } from "lucide-react";
import { PV_SYSTEMS, TOTAL_MODULES } from "@/lib/pv-systems";
import { ANOMALY_KINDS, MISSION, fleetInspection } from "@/lib/inspection";
import { formatEnergy, joinQuantity } from "@/lib/format";
import { KPI_UNIT, KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { formatDelta } from "./levels";

const FLEET = fleetInspection();

export function InspectionSummary({ flightDate }: { flightDate: string }) {
  const hot = FLEET.hottest;

  return (
    <KpiGrid>
      <KpiTile
        energy="thermal"
        delay={40}
        icon={<ScanEye />}
        label="Anomalies found"
        value={FLEET.all.length}
        sub={
          <>
            <span className="font-semibold text-ink-800">{FLEET.critical} critical</span> · {FLEET.newOnes} new
          </>
        }
      />
      <KpiTile
        energy="thermal"
        delay={90}
        icon={<Zap />}
        label="Power at risk"
        value={
          <>
            {(FLEET.lossWp / 1000).toFixed(1)}
            <span className={KPI_UNIT}>kWp</span>
          </>
        }
        sub={
          <>
            ≈ <span className="font-semibold text-ink-800">{joinQuantity(formatEnergy(FLEET.annualKwh))}</span> per year
          </>
        }
      />
      <KpiTile
        energy="thermal"
        delay={140}
        icon={<Thermometer />}
        label="Hottest anomaly"
        value={
          <>
            {formatDelta(hot.deltaT).replace(" K", "")}
            <span className={KPI_UNIT}>K</span>
          </>
        }
        sub={
          <>
            <span className="font-semibold text-ink-800">{PV_SYSTEMS[hot.system].short}</span> ·{" "}
            {ANOMALY_KINDS[hot.type].short}
          </>
        }
      />
      <KpiTile
        energy="thermal"
        delay={190}
        icon={<Drone />}
        label="Modules scanned"
        value={
          <>
            {TOTAL_MODULES.toLocaleString("en-US")}
            <span className={KPI_UNIT}>100 %</span>
          </>
        }
        sub={
          <>
            Flight <span className="font-semibold text-ink-800">{MISSION.id}</span> · {flightDate}
          </>
        }
      />
    </KpiGrid>
  );
}
