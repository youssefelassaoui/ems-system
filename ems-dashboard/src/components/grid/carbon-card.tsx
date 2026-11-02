"use client";

import { Leaf } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { SITE } from "@/lib/site";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/stat";

export function CarbonCard({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const emitted = snapshot.today.gridImportKwh * SITE.gridEmissionFactor;
  const avoided = snapshot.fleet.co2AvoidedKg;
  const share = avoided + emitted > 1 ? avoided / (avoided + emitted) : 0;

  return (
    <Card className={className}>
      <CardHeader title="Carbon footprint" subtitle="Today, based on the grid emission factor" icon={<Leaf className="size-5" />} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Avoided by solar</p>
          <p className="font-display mt-1 text-[30px] font-bold leading-none tracking-tight text-brand-700">
            <AnimatedNumber value={avoided} decimals={0} group />
            <span className="ml-1 text-[0.45em] font-semibold text-ink-400">kg CO₂</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Emitted by imports</p>
          <p className="font-display mt-1 text-[30px] font-bold leading-none tracking-tight text-ink-900">
            <AnimatedNumber value={emitted} decimals={0} group />
            <span className="ml-1 text-[0.45em] font-semibold text-ink-400">kg CO₂</span>
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ProgressBar value={share} />
        <p className="mt-2.5 text-[12.5px] text-ink-500">
          Solar avoided{" "}
          <span className="font-semibold text-ink-800">{(share * 100).toFixed(0)} %</span> of the emissions the
          campus would otherwise have caused today.
        </p>
      </div>

      <p className="mt-5 rounded-2xl bg-ink-50 px-4 py-3 text-[12.5px] text-ink-500 ring-1 ring-inset ring-line">
        Emission factor{" "}
        <span className="font-semibold text-ink-800">{SITE.gridEmissionFactor} kg CO₂ / kWh</span> · {SITE.location}
      </p>
    </Card>
  );
}
