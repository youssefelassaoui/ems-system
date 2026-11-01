"use client";

import { useMemo } from "react";
import { BellRing, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { getEvents, type EnergyEvent } from "@/lib/simulation";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";

const KIND = {
  info: { icon: Info, style: "bg-brand-50 text-brand-600 ring-brand-100" },
  success: { icon: CircleCheck, style: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  warning: { icon: TriangleAlert, style: "bg-amber-50 text-amber-600 ring-amber-100" },
} as const;

export function EventsCard({
  className,
  title = "System events",
  subtitle = "Latest activity across the plant",
  filter,
  limit = 6,
}: {
  className?: string;
  title?: string;
  subtitle?: string;
  /** Keeps only the events that concern a given asset. Must be a stable reference. */
  filter?: (event: EnergyEvent) => boolean;
  limit?: number;
}) {
  const { minute } = useLive();
  const nowStep = Math.floor(minute);

  const events = useMemo<EnergyEvent[]>(
    () =>
      getEvents()
        .filter((e) => e.minute <= nowStep && (filter ? filter(e) : true))
        .reverse()
        .slice(0, limit),
    [nowStep, filter, limit],
  );

  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} icon={<BellRing className="size-5" />} />
      {events.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-400">No events yet today.</p>
      ) : (
        <ol className="relative space-y-4">
          <span className="absolute bottom-2 left-[19px] top-2 w-px bg-gradient-to-b from-brand-200 via-line to-transparent" />
          {events.map((e) => {
            const K = KIND[e.kind];
            const Icon = K.icon;
            return (
              <li key={`${e.minute}-${e.title}`} className="relative flex gap-3.5">
                <span
                  className={cn(
                    "relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl ring-1 ring-inset",
                    K.style,
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-ink-900">{e.title}</p>
                    <time className="num shrink-0 rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] font-semibold text-ink-500">
                      {formatClock(e.minute)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{e.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
