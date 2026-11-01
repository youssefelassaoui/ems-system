"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLive } from "@/providers/live-provider";
import { addDays, formatDate } from "@/lib/weather";
import { SITE } from "@/lib/site";
import { ClockControl } from "./clock-control";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav";

export function Topbar() {
  const pathname = usePathname();
  const { dateISO } = useLive();
  const current =
    NAV_ITEMS.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))) ??
    NAV_ITEMS[0];

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-white/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="min-w-0">
            <p
              data-accent={current.accent}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600"
            >
              {SITE.shortName}
            </p>
            <h1 className="font-display truncate text-[20px] font-bold leading-tight text-ink-900 sm:text-[22px]">
              {current.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-white/85 px-4 py-2.5 text-[12.5px] font-semibold text-ink-600 shadow-soft md:flex">
            <CalendarDays className="size-4 text-brand-600" />
            <span suppressHydrationWarning>
              {formatDate(addDays(dateISO, 0), { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <ClockControl />
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-accent={item.accent}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition",
                active
                  ? "bg-brand-600 text-white shadow-[0_8px_18px_-6px_rgb(var(--accent-rgb)/0.6)]"
                  : "bg-white text-ink-600 ring-1 ring-inset ring-line",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
