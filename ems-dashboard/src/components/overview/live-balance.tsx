"use client";

import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BatteryCharging,
  BatteryFull,
  Building2,
  Check,
  Scale,
  Sun,
} from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { formatPower, joinQuantity } from "@/lib/format";
import { ENERGY } from "@/lib/palette";
import { Card, CardHeader } from "@/components/ui/card";
import { AnimatedQuantity } from "@/components/ui/animated-number";

interface RowProps {
  icon: ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
}

function FlowRow({ icon, label, value, total, color }: RowProps) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const active = value > 1;
  return (
    <li>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ink-700">
          <span
            className="grid size-7 place-items-center rounded-lg text-white"
            style={{ background: color, opacity: active ? 1 : 0.35 }}
          >
            {icon}
          </span>
          {label}
        </span>
        <AnimatedQuantity
          value={value}
          kind="power"
          className="num text-[13.5px] font-bold text-ink-900"
          unitClassName="ml-1 text-[11px] font-semibold text-ink-400"
        />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </li>
  );
}

export function LiveBalance({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const f = snapshot.flows;

  const supply = {
    pv: f.pv,
    battery: f.batteryToLoad,
    grid: f.gridToLoad + f.gridToBattery,
  };
  const demand = {
    load: f.load,
    battery: f.pvToBattery + f.gridToBattery,
    grid: f.pvToGrid,
  };
  const supplyTotal = supply.pv + supply.battery + supply.grid;
  const demandTotal = demand.load + demand.battery + demand.grid;
  const max = Math.max(supplyTotal, demandTotal, 1);

  return (
    <Card className={className}>
      <CardHeader
        title="Power balance"
        subtitle="Every kilowatt, accounted for"
        icon={<Scale className="size-5" />}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
            <Check className="size-3.5" /> Balanced
          </span>
        }
      />

      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Supply
            </p>
            <p className="num text-[12.5px] font-semibold text-ink-500">
              {joinQuantity(formatPower(supplyTotal))}
            </p>
          </div>
          <ul className="space-y-3.5">
            <FlowRow icon={<Sun className="size-4" />} label="Solar PV" value={supply.pv} total={max} color={ENERGY.solar.main} />
            <FlowRow icon={<BatteryFull className="size-4" />} label="Battery discharge" value={supply.battery} total={max} color={ENERGY.battery.main} />
            <FlowRow icon={<ArrowDownToLine className="size-4" />} label="Grid import" value={supply.grid} total={max} color={ENERGY.grid.main} />
          </ul>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Demand
            </p>
            <p className="num text-[12.5px] font-semibold text-ink-500">
              {joinQuantity(formatPower(demandTotal))}
            </p>
          </div>
          <ul className="space-y-3.5">
            <FlowRow icon={<Building2 className="size-4" />} label="Campus load" value={demand.load} total={max} color={ENERGY.load.main} />
            <FlowRow icon={<BatteryCharging className="size-4" />} label="Battery charging" value={demand.battery} total={max} color={ENERGY.battery.main} />
            <FlowRow icon={<ArrowUpFromLine className="size-4" />} label="Grid export" value={demand.grid} total={max} color={ENERGY.grid.main} />
          </ul>
        </div>
      </div>
    </Card>
  );
}
