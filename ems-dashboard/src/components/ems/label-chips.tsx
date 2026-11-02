"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, BatteryCharging, Building2, Cpu, PlugZap, Sun } from "lucide-react";
import { ASSET_INFO, type AssetId } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { formatPower } from "@/lib/format";
import { ENERGY, type EnergyKey } from "@/lib/palette";
import { TOTAL_KWP } from "@/lib/pv-systems";
import { BATTERY } from "@/lib/site";
import type { EnergyFlows } from "@/lib/simulation";
import { LABEL_ANCHORS, type LabelRefs } from "./scene/labels";

interface ChipProps {
  title: string;
  /** Shorter title used by the compact layout. */
  short: string;
  value: string;
  unit?: string;
  sub: string;
  accent: string;
  icon: ReactNode;
}

/**
 * The parent carries `group` + `data-compact`, which <LabelProjector /> sets
 * from the canvas width — so phones get a slimmer chip without a React re-render.
 */
function Chip({
  title,
  short,
  value,
  unit,
  sub,
  accent,
  icon,
  linked,
  active,
}: ChipProps & { linked?: boolean; active?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-[164px] items-center gap-3 rounded-2xl border border-white bg-white/90 py-2.5 pl-2.5 pr-4 backdrop-blur-xl transition-[box-shadow,transform] duration-200 group-data-[compact=true]:min-w-0 group-data-[compact=true]:gap-2 group-data-[compact=true]:rounded-xl group-data-[compact=true]:py-1.5 group-data-[compact=true]:pl-1.5 group-data-[compact=true]:pr-3",
        active
          ? "-translate-y-0.5 shadow-[0_22px_44px_-12px_rgb(var(--accent-rgb)/0.6)] ring-2 ring-brand-500"
          : "shadow-[0_16px_36px_-12px_rgb(var(--accent-rgb)/0.45)] ring-1 ring-brand-100",
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] group-data-[compact=true]:size-8 group-data-[compact=true]:rounded-lg group-data-[compact=true]:[&>svg]:size-4"
        style={{ background: accent }}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
          <span className="group-data-[compact=true]:hidden">{title}</span>
          <span className="hidden group-data-[compact=true]:inline">{short}</span>
        </p>
        <p className="font-display num mt-0.5 whitespace-nowrap text-[18px] font-bold text-ink-900 group-data-[compact=true]:text-[15px]">
          {value}
          {unit && <span className="ml-1 text-[11px] font-semibold text-ink-400">{unit}</span>}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[10.5px] font-medium text-ink-500 group-data-[compact=true]:hidden">
          {sub}
        </p>
      </div>
      {linked && (
        <ArrowUpRight
          className={cn(
            "-ml-1 size-4 shrink-0 self-start transition-colors duration-200 group-data-[compact=true]:hidden",
            active ? "text-brand-600" : "text-ink-300",
          )}
        />
      )}
    </div>
  );
}

const LINKED: readonly AssetId[] = ["pv", "battery", "grid"];

/** Colour scope of every chip (and of its leader line). */
const SCOPE: Record<(typeof LABEL_ANCHORS)[number]["id"], EnergyKey> = {
  pv: "solar",
  battery: "battery",
  grid: "grid",
  campus: "load",
  hub: "load",
};
const isAsset = (id: string): id is AssetId => (LINKED as readonly string[]).includes(id);

/**
 * Floating information chips layered over the 3D canvas.
 * They are positioned every frame by <LabelProjector />.
 */
export function LabelChips({
  flows,
  selfSufficiency,
  labelsRef,
  highlight,
  onHover,
}: {
  flows: EnergyFlows;
  selfSufficiency: number;
  labelsRef: LabelRefs;
  /** Asset currently hovered / pinned — its chip lights up. */
  highlight: AssetId | null;
  /** `anchor` is passed for keyboard focus so the info card can dock next to the chip. */
  onHover: (id: AssetId | null, anchor?: HTMLElement) => void;
}) {
  const pv = formatPower(flows.pv);
  const load = formatPower(flows.load);
  const grid = formatPower(Math.abs(flows.gridNet));
  const batt = formatPower(Math.abs(flows.batteryNet));
  const stored = flows.soc * BATTERY.capacityKwh;

  const batterySub =
    flows.batteryMode === "charging"
      ? `Charging · ${batt.value} ${batt.unit}`
      : flows.batteryMode === "discharging"
        ? `Discharging · ${batt.value} ${batt.unit}`
        : `Standby · ${(stored / 1000).toFixed(2)} MWh`;

  const gridSub =
    flows.gridMode === "exporting"
      ? "Exporting to network"
      : flows.gridMode === "importing"
        ? "Importing from network"
        : "Balanced · standby";

  const content: Record<(typeof LABEL_ANCHORS)[number]["id"], ChipProps> = {
    pv: {
      title: "Solar PV",
      short: "Solar",
      value: pv.value,
      unit: pv.unit,
      sub: `${((flows.pv / TOTAL_KWP) * 100).toFixed(0)}% of ${(TOTAL_KWP / 1000).toFixed(1)} MWp`,
      accent: ENERGY.solar.gradient,
      icon: <Sun className="size-5" />,
    },
    battery: {
      title: "Battery storage",
      short: "Battery",
      value: (flows.soc * 100).toFixed(0),
      unit: "% SOC",
      sub: batterySub,
      accent: ENERGY.battery.gradient,
      icon: <BatteryCharging className="size-5" />,
    },
    grid: {
      title: "Utility grid",
      short: "Grid",
      value: grid.value,
      unit: grid.unit,
      sub: gridSub,
      accent: ENERGY.grid.gradient,
      icon: <PlugZap className="size-5" />,
    },
    campus: {
      title: "Campus load",
      short: "Campus",
      value: load.value,
      unit: load.unit,
      sub: "Buildings · EV · labs",
      accent: ENERGY.load.gradient,
      icon: <Building2 className="size-5" />,
    },
    hub: {
      title: "Core",
      short: "Core",
      value: (selfSufficiency * 100).toFixed(0),
      unit: "% autarky",
      sub: "Optimising in real time",
      accent: "linear-gradient(135deg,#1d4ed8,#0b1d4d)",
      icon: <Cpu className="size-5" />,
    },
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      {LABEL_ANCHORS.map((a) => {
        const ref = (el: HTMLElement | null) => {
          labelsRef.current[a.id] = el;
        };
        const wrapperClass = "group absolute left-0 top-0 will-change-transform";
        const wrapperStyle = { opacity: 0, transformOrigin: "50% 100%" };
        /* Leader line — its height is driven by <LabelProjector />; it must stay the last child. */
        const leader = (
          <span
            className="pointer-events-none absolute left-1/2 top-full w-px -translate-x-1/2 bg-gradient-to-b from-brand-300 to-brand-500/80 after:absolute after:-bottom-1 after:left-1/2 after:size-2 after:-translate-x-1/2 after:rounded-full after:bg-brand-600 after:ring-2 after:ring-white after:content-['']"
            style={{ height: 0, transformOrigin: "50% 0" }}
          />
        );

        if (!isAsset(a.id)) {
          return (
            <div key={a.id} ref={ref} data-accent={SCOPE[a.id]} className={wrapperClass} style={wrapperStyle} aria-hidden>
              <Chip {...content[a.id]} />
              {leader}
            </div>
          );
        }

        const id = a.id;
        const info = ASSET_INFO[id];
        return (
          <Link
            key={id}
            ref={ref}
            data-accent={SCOPE[id]}
            href={info.href}
            aria-label={`${content[id].title} — ${info.cta.toLowerCase()}`}
            className={cn(
              wrapperClass,
              "pointer-events-auto cursor-pointer rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-300/60",
            )}
            style={wrapperStyle}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") onHover(id);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") onHover(null);
            }}
            onFocus={(e) => onHover(id, e.currentTarget)}
            onBlur={() => onHover(null)}
          >
            <Chip {...content[id]} linked active={highlight === id} />
            {leader}
          </Link>
        );
      })}
    </div>
  );
}
