"use client";

import { useMemo, type ReactNode } from "react";
import { Cloud, Droplets, Eye, Gauge, Sun, Wind } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { CONDITION_LABEL, getCurrentConditions } from "@/lib/weather";
import { formatClock } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SunArc } from "./sun-arc";
import { WeatherIcon } from "./weather-icon";

function Metric({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/65">
        <span className="[&>svg]:size-3.5">{icon}</span>
        {label}
      </p>
      <p className="num mt-1.5 text-[17px] font-bold leading-none text-white">{children}</p>
    </div>
  );
}

export function CurrentConditions({ className }: { className?: string }) {
  const { minute, noiseSeconds, snapshot } = useLive();

  const c = useMemo(
    () => getCurrentConditions(minute, snapshot.ambientC, snapshot.ghi, snapshot.transmittance, noiseSeconds),
    [minute, snapshot.ambientC, snapshot.ghi, snapshot.transmittance, noiseSeconds],
  );

  return (
    <Card tone="brand" className={className}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="inverted" dot>
              Live conditions
            </Badge>
            <span className="text-[12.5px] text-white/75">
              {formatClock(minute)}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-5">
            <span className="grid size-[88px] shrink-0 place-items-center rounded-[28px] bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <WeatherIcon condition={c.condition} isDay={c.isDay} className="size-11 text-white" />
            </span>
            <div>
              <div className="font-display flex items-start text-[64px] font-bold leading-none tracking-tight">
                <AnimatedNumber value={c.tempC} decimals={0} />
                <span className="mt-1 text-[0.42em] font-semibold text-white/70">°C</span>
              </div>
              <p className="mt-2 text-[15px] font-semibold">{CONDITION_LABEL[c.condition]}</p>
              <p className="text-[12.5px] text-white/70">Feels like {c.feelsLikeC.toFixed(0)}°C</p>
            </div>
          </div>
        </div>

        <SunArc minute={minute} className="mx-auto w-full max-w-[380px]" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric icon={<Cloud />} label="Cloud cover">
          {c.cloud.toFixed(0)}
          <span className="ml-0.5 text-[11px] font-semibold text-white/70">%</span>
        </Metric>
        <Metric icon={<Droplets />} label="Humidity">
          {c.humidity.toFixed(0)}
          <span className="ml-0.5 text-[11px] font-semibold text-white/70">%</span>
        </Metric>
        <Metric icon={<Wind />} label="Wind">
          {c.windKmh.toFixed(0)}
          <span className="ml-1 text-[11px] font-semibold text-white/70">km/h {c.windDir}</span>
        </Metric>
        <Metric icon={<Gauge />} label="Pressure">
          {c.pressure.toFixed(0)}
          <span className="ml-1 text-[11px] font-semibold text-white/70">hPa</span>
        </Metric>
        <Metric icon={<Sun />} label="UV index">
          {c.uv.toFixed(1)}
        </Metric>
        <Metric icon={<Eye />} label="Visibility">
          {c.visibilityKm.toFixed(0)}
          <span className="ml-1 text-[11px] font-semibold text-white/70">km</span>
        </Metric>
      </div>
    </Card>
  );
}
