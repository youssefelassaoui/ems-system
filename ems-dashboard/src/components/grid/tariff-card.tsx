"use client";

import { useMemo } from "react";
import { Clock3 } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { TARIFF_WINDOWS } from "@/lib/assets";
import { getDayModel } from "@/lib/simulation";
import { formatClock, formatEnergy, joinQuantity } from "@/lib/format";
import { TARIFF_COLOR } from "@/lib/palette";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

type WindowId = (typeof TARIFF_WINDOWS)[number]["id"];

/** Cheap = green, shoulder = amber, expensive = red — the same reading as a price board. */
const COLOR: Record<WindowId, string> = TARIFF_COLOR;

const windowOf = (m: number): WindowId => (m >= 1320 || m < 360 ? "offpeak" : m >= 1080 ? "peak" : "day");

/** 24 h tariff timeline, split in hour-aligned segments. */
const SEGMENTS: { id: WindowId; from: number; to: number }[] = [
  { id: "offpeak", from: 0, to: 360 },
  { id: "day", from: 360, to: 1080 },
  { id: "peak", from: 1080, to: 1320 },
  { id: "offpeak", from: 1320, to: 1440 },
];

export function TariffCard({ className }: { className?: string }) {
  const { minute } = useLive();
  const nowMin = Math.floor(minute);
  const nowStep = Math.floor(minute / 10);

  const totals = useMemo(() => {
    const model = getDayModel();
    const out: Record<WindowId, { imported: number; exported: number }> = {
      offpeak: { imported: 0, exported: 0 },
      day: { imported: 0, exported: 0 },
      peak: { imported: 0, exported: 0 },
    };
    const upTo = Math.min(1439, nowStep * 10);
    for (let m = 0; m <= upTo; m++) {
      const net = model.gridNet[m] / 60;
      const w = out[windowOf(m)];
      if (net > 0) w.imported += net;
      else w.exported -= net;
    }
    return out;
  }, [nowStep]);

  const current = TARIFF_WINDOWS.find((w) => w.id === windowOf(nowMin)) ?? TARIFF_WINDOWS[1];

  return (
    <Card className={className}>
      <CardHeader
        title="Tariff windows"
        subtitle="Illustrative time-of-use schedule · storage shifts energy accordingly"
        icon={<Clock3 className="size-5" />}
        action={
          <Badge tone="brand" dot>
            {current.label} now
          </Badge>
        }
      />

      {/* Timeline */}
      <div className="relative pt-5">
        <div className="relative flex h-5 overflow-hidden rounded-full ring-1 ring-inset ring-line">
          {SEGMENTS.map((s) => (
            <div
              key={`${s.id}-${s.from}`}
              className="h-full"
              style={{ width: `${((s.to - s.from) / 1440) * 100}%`, background: COLOR[s.id] }}
            />
          ))}
        </div>
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center transition-[left] duration-1000 ease-out"
          style={{ left: `${(minute / 1440) * 100}%` }}
        >
          <span className="rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <span suppressHydrationWarning>{formatClock(nowMin)}</span>
          </span>
          <span className="h-[26px] w-0.5 rounded-full bg-ink-900" />
        </div>
        <div className="relative mt-2 h-4 text-[11px] font-semibold text-ink-400">
          {[0, 360, 1080, 1320, 1440].map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(m / 1440) * 100}%` }}
            >
              {m === 1440 ? "24:00" : formatClock(m)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {TARIFF_WINDOWS.map((w) => {
          const t = totals[w.id];
          const active = w.id === current.id;
          return (
            <div
              key={w.id}
              className={
                active
                  ? "rounded-2xl border border-brand-200 bg-brand-50/60 p-4 ring-1 ring-brand-100"
                  : "rounded-2xl border border-line bg-white p-4"
              }
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: COLOR[w.id] }} />
                <p className="text-[13px] font-semibold text-ink-900">{w.label}</p>
              </div>
              <p className="num mt-0.5 text-[11.5px] text-ink-400">
                {formatClock(w.from % 1440)} – {formatClock(w.to % 1440)}
              </p>
              <dl className="mt-3 space-y-1.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Imported</dt>
                  <dd className="num font-semibold text-ink-900">{joinQuantity(formatEnergy(t.imported))}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-500">Exported</dt>
                  <dd className="num font-semibold text-ink-900">{joinQuantity(formatEnergy(t.exported))}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11.5px] leading-snug text-ink-400">{w.note}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
