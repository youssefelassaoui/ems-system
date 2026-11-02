"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BatteryCharging, ChevronLeft, ChevronRight, Radio, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { BATTERY } from "@/lib/site";
import { TOTAL_KWP } from "@/lib/pv-systems";
import { LogoMark } from "./logo";
import { NAV_ITEMS } from "./nav";
import { LiveDot } from "@/components/ui/live-dot";

/** Width of the always-visible icon rail — keep in sync with `lg:pl-[84px]` in the shell. */
export const RAIL_WIDTH = 84;

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 whitespace-nowrap rounded-xl bg-ink-900 px-3 py-1.5 text-[12.5px] font-semibold text-white opacity-0 shadow-[0_12px_30px_-10px_rgb(13_27_62/0.55)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

export function Sidebar({
  expanded,
  onToggle,
  onNavigate,
}: {
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      data-expanded={expanded}
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-0 hidden flex-col border-r border-line bg-white/85 px-[18px] pb-5 pt-6 backdrop-blur-2xl transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex",
        expanded
          ? "z-40 w-[272px] shadow-[0_40px_90px_-24px_rgb(19_47_120/0.38)]"
          : "z-30 w-[84px]",
      )}
    >
      {/* Edge toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="group absolute -right-3.5 top-[34px] z-10 grid size-7 place-items-center rounded-full border border-line bg-white text-ink-500 shadow-soft transition hover:scale-105 hover:border-brand-200 hover:text-brand-700"
      >
        {expanded ? (
          <ChevronLeft className="size-4" strokeWidth={2.4} />
        ) : (
          <ChevronRight className="size-4" strokeWidth={2.4} />
        )}
      </button>

      {/* Brand */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="Logo — overview"
        className="flex items-center rounded-xl pl-[3.5px]"
      >
        <LogoMark className="shrink-0" />
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap leading-tight transition-[max-width,opacity,margin] duration-300",
            expanded ? "ml-3 max-w-[180px] opacity-100" : "ml-0 max-w-0 opacity-0",
          )}
        >
          <span className="font-display block text-[17px] font-bold tracking-tight text-ink-900">Logo</span>
        </span>
      </Link>

      <nav className="mt-9 flex flex-col gap-1.5" aria-label="Main">
        <div className="relative mb-2 h-4">
          <p
            className={cn(
              "absolute left-[5.5px] top-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400 transition-opacity duration-300",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            Monitor
          </p>
          <span
            className={cn(
              "absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 bg-line transition-opacity duration-300",
              expanded ? "opacity-0" : "opacity-100",
            )}
          />
        </div>

        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "group relative flex items-center rounded-2xl px-[5.5px] py-[5.5px] text-[14px] font-semibold transition-colors duration-300",
                active
                  ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_var(--color-brand-100)]"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              <span
                className={cn(
                  "absolute -left-[18px] h-6 w-1 rounded-r-full bg-brand-600 transition-opacity duration-300",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl transition-all duration-300",
                  active
                    ? "bg-brand-600 text-white shadow-glow"
                    : "bg-ink-50 text-ink-500 group-hover:bg-white group-hover:text-brand-600",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={2} />
              </span>
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300",
                  expanded ? "ml-3 max-w-[190px] opacity-100" : "ml-0 max-w-0 opacity-0",
                )}
              >
                {item.label}
              </span>
              {!expanded && <Tooltip>{item.label}</Tooltip>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        {expanded ? (
          <div className="enter">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900 p-5 text-white shadow-glow">
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-8 size-40 rounded-full bg-sky-300/25 blur-2xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ring-white/25">
                    <LiveDot className="text-white" />
                    Grid connected
                  </span>
                  <Radio className="size-4 text-white/70" />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-inset ring-white/15">
                    <dt className="flex items-center gap-1.5 text-[11px] text-white/70">
                      <Sun className="size-3.5" /> Solar
                    </dt>
                    <dd className="font-display mt-1 text-[15px] font-bold">
                      {(TOTAL_KWP / 1000).toFixed(2)}{" "}
                      <span className="text-[11px] font-medium text-white/70">MWp</span>
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-inset ring-white/15">
                    <dt className="flex items-center gap-1.5 text-[11px] text-white/70">
                      <BatteryCharging className="size-3.5" /> Storage
                    </dt>
                    <dd className="font-display mt-1 text-[15px] font-bold">
                      {(BATTERY.capacityKwh / 1000).toFixed(1)}{" "}
                      <span className="text-[11px] font-medium text-white/70">MWh</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <p className="mt-4 px-2 text-center text-[11px] text-ink-400">Simulated telemetry · v0.1</p>
          </div>
        ) : (
          <div
            className="group relative mx-auto grid size-[47px] place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900 text-white shadow-glow"
            aria-label="Grid connected"
          >
            <Radio className="size-[18px]" />
            <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-white">
              <LiveDot />
            </span>
            <Tooltip>Grid connected</Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
}
