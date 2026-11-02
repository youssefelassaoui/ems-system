"use client";

import { BatteryCharging } from "lucide-react";
import { ASSET_INFO } from "@/lib/assets";
import type { EnergyEvent } from "@/lib/simulation";
import { EventsCard } from "@/components/overview/events-card";
import { SpecsCard } from "@/components/ui/specs-card";
import { BatteryChart } from "./battery-chart";
import { StrategyCard } from "./strategy-card";
import { BatterySummary } from "./summary-row";
import { UnitCards } from "./unit-cards";

const isBatteryEvent = (e: EnergyEvent) => /battery/i.test(`${e.title} ${e.detail}`);

export function BatteryView() {
  return (
    <div className="space-y-6">
      <BatterySummary />

      <BatteryChart className="enter [animation-delay:200ms]" />

      <UnitCards />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <StrategyCard className="enter [animation-delay:120ms]" />
        <SpecsCard
          className="enter [animation-delay:180ms]"
          title="Specifications"
          subtitle="Containerised LFP storage"
          icon={<BatteryCharging className="size-5" />}
          specs={ASSET_INFO.battery.specs}
        />
        <EventsCard
          className="enter [animation-delay:240ms] lg:col-span-2 xl:col-span-1"
          title="Battery events"
          subtitle="Charge, discharge and limits"
          filter={isBatteryEvent}
        />
      </div>
    </div>
  );
}
