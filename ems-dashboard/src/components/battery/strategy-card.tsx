"use client";

import { MoonStar, ShieldCheck, Sun, Sunset, Workflow } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { BATTERY } from "@/lib/site";
import { Card, CardHeader } from "@/components/ui/card";

const RULES = [
  {
    icon: Sun,
    title: "Absorb the solar surplus",
    text: "PV power above the campus demand charges the battery first — only what is left is exported.",
  },
  {
    icon: Sunset,
    title: "Cover the evening",
    text: "When the sun fades the stored energy supplies the load, shaving the grid peak.",
  },
  {
    icon: MoonStar,
    title: "Hold & top-up at night",
    text: "From 22:00 to 06:00 the bank is held and topped up from the grid to 35 % if it is lower.",
  },
  {
    icon: ShieldCheck,
    title: "Protect the cells",
    text: `Power tapers near ${(BATTERY.socMin * 100).toFixed(0)} % and ${(BATTERY.socMax * 100).toFixed(0)} % SOC and never exceeds ±${(BATTERY.maxChargeKw / 1000).toFixed(1)} MW.`,
  },
] as const;

export function StrategyCard({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const soc = snapshot.flows.soc * 100;
  const min = BATTERY.socMin * 100;
  const max = BATTERY.socMax * 100;

  return (
    <Card className={className}>
      <CardHeader title="Operating strategy" subtitle="How storage is dispatched" icon={<Workflow className="size-5" />} />

      {/* Usable window */}
      <div className="mb-6">
        <div className="relative h-3 rounded-full bg-ink-100">
          {/* reserves */}
          <div
            className="absolute inset-y-0 left-0 rounded-l-full bg-[repeating-linear-gradient(135deg,#d9e2f2_0_4px,#eaf0fa_4px_8px)]"
            style={{ width: `${min}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-[repeating-linear-gradient(135deg,#d9e2f2_0_4px,#eaf0fa_4px_8px)]"
            style={{ width: `${100 - max}%` }}
          />
          {/* usable */}
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-brand-200 to-brand-400/80"
            style={{ left: `${min}%`, width: `${max - min}%` }}
          />
          {/* now */}
          <span
            className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-600 shadow-[0_6px_14px_-4px_rgb(var(--accent-rgb)/0.7)] transition-[left] duration-1000 ease-out"
            style={{ left: `${soc}%` }}
          />
        </div>
        <div className="relative mt-2 h-4 text-[11px] font-semibold text-ink-400">
          <span className="absolute -translate-x-1/2" style={{ left: `${min}%` }}>
            {min.toFixed(0)} %
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: `${max}%` }}>
            {max.toFixed(0)} %
          </span>
        </div>
        <p className="mt-1 text-[12px] text-ink-500">
          Usable window <span className="font-semibold text-ink-800">{min.toFixed(0)}–{max.toFixed(0)} %</span> · hatched
          zones are protected reserves.
        </p>
      </div>

      <ul className="space-y-4">
        {RULES.map((r) => (
          <li key={r.title} className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
              <r.icon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink-900">{r.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{r.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
