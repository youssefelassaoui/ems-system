"use client";

import { useMemo } from "react";
import { SunMedium } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { clearSkyGhi, getDayModel } from "@/lib/simulation";
import { getCurrentConditions } from "@/lib/weather";
import { formatPower, joinQuantity } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { RadialGauge } from "@/components/ui/radial-gauge";

const MAX_IRRADIANCE = 1100;

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-medium text-ink-600">{label}</span>
        <span className="num font-semibold text-ink-900">
          {Math.round(value)} <span className="text-[11px] font-medium text-ink-400">W/m²</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${Math.min(100, (value / MAX_IRRADIANCE) * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function IrradianceCard({ className }: { className?: string }) {
  const { minute, noiseSeconds, snapshot } = useLive();

  const c = useMemo(
    () => getCurrentConditions(minute, snapshot.ambientC, snapshot.ghi, snapshot.transmittance, noiseSeconds),
    [minute, snapshot.ambientC, snapshot.ghi, snapshot.transmittance, noiseSeconds],
  );

  const clear = clearSkyGhi(minute);
  const clearnessIndex = clear > 5 ? Math.min(1, c.ghi / clear) : 0;
  const forecastNow = getDayModel().pvForecast[Math.min(1439, Math.floor(minute))];
  const actualNow = snapshot.fleet.powerKw;
  const delta = forecastNow > 5 ? ((actualNow - forecastNow) / forecastNow) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader
        title="Solar resource"
        subtitle="Irradiance on the horizontal plane"
        icon={<SunMedium className="size-5" />}
      />

      <div className="flex items-center gap-5">
        <RadialGauge value={clearnessIndex} size={112} stroke={11} arc>
          <div className="pt-1">
            <div className="font-display text-[26px] font-bold leading-none text-ink-900">
              <AnimatedNumber value={clearnessIndex * 100} decimals={0} />
              <span className="text-[12px] text-ink-400">%</span>
            </div>
            <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-wider text-ink-400">Clear-sky</p>
          </div>
        </RadialGauge>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Global horizontal</p>
          <p className="font-display mt-1 text-[34px] font-bold leading-none tracking-tight text-ink-900">
            <AnimatedNumber value={c.ghi} decimals={0} />
            <span className="ml-1 text-[0.4em] font-semibold text-ink-400">W/m²</span>
          </p>
          <p className="mt-2 text-[12px] text-ink-400">
            Clear-sky reference <span className="num font-semibold text-ink-600">{Math.round(clear)}</span> W/m²
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Bar label="GHI · global" value={c.ghi} color="linear-gradient(90deg,#fcd34d,#f59e0b)" />
        <Bar label="DNI · direct" value={c.dni} color="linear-gradient(90deg,#fb923c,#dc4a0c)" />
        <Bar label="DHI · diffuse" value={c.dhi} color="linear-gradient(90deg,#bae6fd,#38bdf8)" />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/90 to-white px-4 py-3.5">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-600">PV now vs forecast</p>
          <p className="num mt-1 text-[13px] text-ink-500">
            <span className="text-[18px] font-bold text-ink-900">{joinQuantity(formatPower(actualNow))}</span>
            <span className="mx-1.5 text-ink-300">/</span>
            {joinQuantity(formatPower(forecastNow))}
          </p>
        </div>
        <span
          className={
            "num rounded-full px-3 py-1.5 text-[12px] font-bold ring-1 ring-inset " +
            (Math.abs(delta) < 8
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : delta < 0
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-sky-50 text-sky-700 ring-sky-200")
          }
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>
    </Card>
  );
}
