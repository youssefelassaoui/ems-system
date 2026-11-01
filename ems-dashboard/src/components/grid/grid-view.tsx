"use client";

import { Cable } from "lucide-react";
import { useMemo } from "react";
import { useLive } from "@/providers/live-provider";
import { ASSET_INFO } from "@/lib/assets";
import { formatPower, joinQuantity } from "@/lib/format";
import { getDayModel, type EnergyEvent } from "@/lib/simulation";
import { EventsCard } from "@/components/overview/events-card";
import { SpecsCard } from "@/components/ui/specs-card";
import { CarbonCard } from "./carbon-card";
import { GridChart } from "./grid-chart";
import { GridSummary } from "./summary-row";
import { TariffCard } from "./tariff-card";

const isGridEvent = (e: EnergyEvent) => /grid|export|import|network/i.test(`${e.title} ${e.detail}`);

export function GridView() {
  const { minute } = useLive();
  const nowStep = Math.floor(minute / 10);

  const peaks = useMemo(() => {
    const model = getDayModel();
    let imp = 0;
    let exp = 0;
    for (let m = 0; m <= Math.min(1439, nowStep * 10); m++) {
      const v = model.gridNet[m];
      if (v > imp) imp = v;
      if (-v > exp) exp = -v;
    }
    return { imp, exp };
  }, [nowStep]);

  return (
    <div data-accent="grid" className="space-y-6">
      <GridSummary />

      <GridChart className="enter [animation-delay:200ms]" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <TariffCard className="enter [animation-delay:120ms]" />
        <SpecsCard
          className="enter [animation-delay:180ms]"
          title="Connection"
          subtitle="Point of common coupling"
          icon={<Cable className="size-5" />}
          specs={ASSET_INFO.grid.specs}
          footer={
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">Peak import</p>
                <p className="num mt-0.5 font-semibold text-ink-900">{joinQuantity(formatPower(peaks.imp))}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400">Peak export</p>
                <p className="num mt-0.5 font-semibold text-ink-900">{joinQuantity(formatPower(peaks.exp))}</p>
              </div>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <CarbonCard className="enter [animation-delay:120ms]" />
        <EventsCard
          className="enter [animation-delay:180ms]"
          title="Grid events"
          subtitle="Imports, exports and top-ups"
          filter={isGridEvent}
        />
      </div>
    </div>
  );
}
