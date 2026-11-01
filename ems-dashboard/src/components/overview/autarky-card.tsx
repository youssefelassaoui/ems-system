"use client";

import { Gauge, Leaf, Recycle, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useLive } from "@/providers/live-provider";
import { AnimatedNumber, AnimatedQuantity } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { formatEnergy, joinQuantity } from "@/lib/format";

function Stat({
  icon,
  label,
  accent,
  children,
}: {
  icon: ReactNode;
  label: string;
  /** Colour scope of the icon tile. */
  accent: "solar" | "eco";
  children: ReactNode;
}) {
  return (
    <div data-accent={accent} className="flex items-center gap-3 rounded-2xl bg-ink-50/80 px-4 py-3 ring-1 ring-inset ring-line">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-soft">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</p>
        <p className="font-display text-[19px] font-bold leading-tight text-ink-900">{children}</p>
      </div>
    </div>
  );
}

export function AutarkyCard({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const { today, fleet } = snapshot;

  return (
    <Card className={className}>
      <CardHeader
        title="Autonomy & impact"
        subtitle="How self-reliant the campus is today"
        icon={<Gauge className="size-5" />}
      />

      <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
        {/* Autarky is green: the share of the campus served by its own clean energy. */}
        <div data-accent="eco">
          <RadialGauge value={today.selfSufficiency} size={150} stroke={13}>
            <div className="font-display text-[34px] font-bold leading-none text-ink-900">
              <AnimatedNumber value={today.selfSufficiency * 100} decimals={0} />
              <span className="text-[17px] text-ink-400">%</span>
            </div>
            <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Autarky
            </p>
          </RadialGauge>
        </div>

        <div className="w-full min-w-0 flex-1 space-y-2.5">
          <Stat accent="solar" icon={<Recycle className="size-[18px]" />} label="Self-consumption">
            <AnimatedNumber value={today.selfConsumption * 100} decimals={0} />%
          </Stat>
          <Stat accent="eco" icon={<Leaf className="size-[18px]" />} label="CO₂ avoided">
            <AnimatedNumber value={fleet.co2AvoidedKg / 1000} decimals={2} />
            <span className="ml-1 text-[12px] font-semibold text-ink-400">tonnes</span>
          </Stat>
          <Stat accent="solar" icon={<Sun className="size-[18px]" />} label="Solar yield today">
            <AnimatedQuantity
              value={fleet.todayKwh}
              kind="energy"
              unitClassName="ml-1 text-[12px] font-semibold text-ink-400"
            />
          </Stat>
        </div>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-ink-400">
        {joinQuantity(formatEnergy(today.pvToLoadKwh + today.batteryDischargedKwh))} of the campus demand was
        served by on-site energy — solar direct plus stored battery energy.
      </p>
    </Card>
  );
}
