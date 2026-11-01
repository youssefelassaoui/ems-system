"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, BatteryCharging, PlugZap, Sun } from "lucide-react";
import { ASSET_INFO, type AssetId } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { ASSET_ACCENT, ENERGY } from "@/lib/palette";

export const ASSET_STYLE: Record<AssetId, { accent: string; icon: ReactNode }> = {
  pv: {
    accent: ENERGY.solar.gradient,
    icon: <Sun className="size-5" />,
  },
  battery: {
    accent: ENERGY.battery.gradient,
    icon: <BatteryCharging className="size-5" />,
  },
  grid: {
    accent: ENERGY.grid.gradient,
    icon: <PlugZap className="size-5" />,
  },
};

/**
 * Static fact sheet shown when an asset is hovered in the 3D scene.
 * `interactive` turns the footer into a real link (touch devices, where there is no hover).
 */
export function AssetCard({
  id,
  interactive = false,
  compact = false,
  className,
}: {
  id: AssetId;
  interactive?: boolean;
  /** Drops the description and tightens the spacing (phones). */
  compact?: boolean;
  className?: string;
}) {
  const info = ASSET_INFO[id];
  const style = ASSET_STYLE[id];

  const footer = (
    <span className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2 text-[12px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-100">
      {interactive ? info.cta : `Click to ${info.cta.toLowerCase()}`}
      <ArrowUpRight className="size-3.5 shrink-0" />
    </span>
  );

  return (
    <div
      data-accent={ASSET_ACCENT[id]}
      className={cn(
        "animate-pop w-[288px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white bg-white/95 p-4 shadow-[0_26px_60px_-18px_rgb(var(--accent-rgb)/0.5)] ring-1 ring-brand-100 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={{ background: style.accent }}
        >
          {style.icon}
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-[15px] font-bold leading-tight text-ink-900">{info.title}</p>
          <p className="truncate text-[12px] font-medium text-ink-400">{info.subtitle}</p>
        </div>
      </div>

      {!compact && <p className="mt-3 text-[12.5px] leading-snug text-ink-500">{info.summary}</p>}

      <dl className={cn("grid grid-cols-2 gap-2", compact ? "mt-3" : "mt-3.5")}>
        {info.highlights.map((h) => (
          <div
            key={h.label}
            className={cn("rounded-xl bg-ink-50 px-3 ring-1 ring-inset ring-line", compact ? "py-1.5" : "py-2")}
          >
            <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{h.label}</dt>
            <dd className="num mt-0.5 text-[13px] font-bold leading-tight text-ink-900">{h.value}</dd>
          </div>
        ))}
      </dl>

      <div className={compact ? "mt-3" : "mt-3.5"}>
        {interactive ? (
          <Link href={info.href} className="block transition hover:opacity-90">
            {footer}
          </Link>
        ) : (
          footer
        )}
      </div>
    </div>
  );
}
