"use client";

import { useState } from "react";
import { useLive } from "@/providers/live-provider";
import { getForecast } from "@/lib/weather";
import { Accuracy } from "./accuracy";
import { CurrentConditions } from "./current-conditions";
import { dayLabel } from "./day-label";
import { HourlyStrip } from "./hourly-strip";
import { Insights } from "./insights";
import { IrradianceCard } from "./irradiance-card";
import { Outlook } from "./outlook";
import { PvForecast } from "./pv-forecast";
import { WeatherCharts } from "./weather-charts";

export function ForecastView() {
  const { dateISO } = useLive();
  const days = getForecast();
  const [selected, setSelected] = useState(0);
  const day = days[selected];
  const label = dayLabel(selected, dateISO).full;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <CurrentConditions className="enter [animation-delay:40ms]" />
        <IrradianceCard className="enter [animation-delay:120ms]" />
      </div>

      <Outlook days={days} selected={selected} onSelect={setSelected} dateISO={dateISO} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PvForecast day={day} label={label} />
        <Insights days={days} dateISO={dateISO} />
      </div>

      <WeatherCharts day={day} />
      <HourlyStrip day={day} label={label} />
      <Accuracy dateISO={dateISO} />
    </div>
  );
}
