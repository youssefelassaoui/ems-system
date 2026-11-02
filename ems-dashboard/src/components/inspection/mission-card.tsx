import type { ReactNode } from "react";
import { Camera, CloudSun, Drone, Images, Ruler, ScanEye } from "lucide-react";
import { TOTAL_MODULES } from "@/lib/pv-systems";
import { MISSION } from "@/lib/inspection";
import { Card } from "@/components/ui/card";
import { IRONBOW_CSS } from "./ironbow";
import { SurveyMap } from "./survey-map";

function Fact({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-ink-50/60 px-3.5 py-3 ring-1 ring-inset ring-line">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-soft ring-1 ring-brand-100 [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0" title={typeof sub === "string" ? sub : undefined}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
        <p className="truncate text-[13.5px] font-semibold text-ink-900">{value}</p>
        {sub && <p className="truncate text-[11.5px] text-ink-500">{sub}</p>}
      </div>
    </div>
  );
}

export function MissionCard({ flightDate }: { flightDate: string }) {
  const irradianceOk = MISSION.irradiance >= MISSION.minIrradiance;
  return (
    <Card padded={false} className="enter" style={{ animationDelay: "60ms" }}>
      <div className="grid lg:grid-cols-12">
        <SurveyMap className="h-[280px] sm:h-[320px] lg:col-span-5 lg:h-auto lg:min-h-[330px]" />

        <div className="p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-[17px] font-bold text-ink-900">Flight {MISSION.id}</h2>
              <p className="text-[12.5px] text-ink-500">
                {flightDate} · {MISSION.start}–{MISSION.end} · thermal and RGB images of every module
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="size-1.5 rounded-full bg-current" />
              Next flight in {MISSION.nextInDays} days
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <Fact icon={<Drone />} label="Aircraft" value={MISSION.drone} sub={`RTK positioning · ${MISSION.batteries} batteries`} />
            <Fact icon={<Camera />} label="Sensors" value={MISSION.thermal} sub={`+ ${MISSION.rgb}`} />
            <Fact
              icon={<Ruler />}
              label="Resolution"
              value={`${MISSION.gsdThermalCm} cm/px thermal`}
              sub={`${MISSION.gsdRgbCm} cm/px RGB · ${MISSION.speedMs} m/s`}
            />
            <Fact
              icon={<CloudSun />}
              label="Conditions"
              value={`${MISSION.irradiance} W/m² · ${MISSION.ambientC} °C`}
              sub={`Wind ${MISSION.windMs} m/s · ${irradianceOk ? "IEC OK" : "too dark"}`}
            />
            <Fact
              icon={<Images />}
              label="Images"
              value={MISSION.images.toLocaleString("en-US")}
              sub={`Overlap ${MISSION.overlap}`}
            />
            <Fact
              icon={<ScanEye />}
              label="Coverage"
              value={`${TOTAL_MODULES.toLocaleString("en-US")} / ${TOTAL_MODULES.toLocaleString("en-US")} modules`}
              sub={
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-10 rounded-full" style={{ background: IRONBOW_CSS }} />
                  radiometric, every module
                </span>
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
