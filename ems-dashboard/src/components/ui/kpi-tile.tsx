import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { ENERGY } from "@/lib/palette";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/ui/sparkline";

/** Unit suffix style for figures inside a tile (`<AnimatedQuantity unitClassName={KPI_UNIT} />`). */
export const KPI_UNIT = "ml-1 text-[0.5em] font-semibold text-ink-400";

/** The compact KPI strip shared by every page: four tiles, two per row on small screens. */
export function KpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

export interface KpiTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  /** One short line under the value. */
  sub: ReactNode;
  /** Optional trend drawn on the right when the tile is wide enough. */
  series?: readonly number[];
  /** Makes the tile a link to the asset's detail page. */
  href?: string;
  /** Entrance animation delay, in ms. */
  delay?: number;
  min?: number;
  max?: number;
}

/**
 * Compact KPI tile in the platform blue: a soft wash, a slim rail, the label, a live figure
 * and an optional sparkline.
 */
export function KpiTile({ icon, label, value, sub, series, href, delay = 0, min, max }: KpiTileProps) {
  const className = cn(
    "enter group relative flex h-[72px] items-center gap-2.5 overflow-hidden rounded-[20px] border border-line bg-white px-3 shadow-accent-card transition-all duration-300 sm:h-[84px] sm:gap-3.5 sm:rounded-[22px] sm:px-4",
    href && "hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-accent-lift",
  );

  const content = (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-brand-50 via-brand-50/50 to-transparent" />
      <span className="pointer-events-none absolute inset-y-3.5 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-brand-300 to-brand-600" />

      <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgb(var(--accent-rgb)/0.7)] sm:size-10 sm:rounded-2xl [&>svg]:size-4 sm:[&>svg]:size-[19px]">
        {icon}
      </span>

      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-700/70 sm:text-[11px] sm:tracking-[0.12em]">
          {label}
        </p>
        <div className="font-display mt-0.5 truncate text-[20px] font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-[26px]">
          {value}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-ink-500">{sub}</p>
      </div>

      {series && (
        <div className="relative hidden w-[72px] shrink-0 self-end pb-3 sm:max-lg:block min-[1340px]:block">
          <Sparkline data={series} color={ENERGY.load.main} height={36} min={min} max={max} />
        </div>
      )}

      {href && (
        <ArrowUpRight className="absolute right-3 top-2.5 size-3.5 -translate-x-1 translate-y-1 text-brand-600 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
      )}
    </>
  );

  const style = { animationDelay: `${delay}ms` };

  return href ? (
    <Link href={href} className={className} style={style} aria-label={`${label} details`}>
      {content}
    </Link>
  ) : (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
