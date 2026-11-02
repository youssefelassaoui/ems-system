# Chaire EMS — Energy Management Dashboard

A Next.js dashboard for a hybrid energy site: **PV production**, **battery storage** and **grid exchange**,
with a live 3D digital twin, per-system PV performance and weather-driven production forecasts.

Design language: white surfaces with a blue chrome (`brand-*` scale in `src/app/globals.css`) and
**realistic energy colours** for the data, Plus Jakarta Sans for display text, Inter for body text,
tabular numerals for every live figure.

### Energy colours

| Source      | Colour | Used for |
| ----------- | ------ | -------- |
| Solar PV    | amber / orange | PV KPI, production page, solar flow, panel glow, irradiance and PV forecast charts |
| Battery     | green  | storage KPI, battery page, SOC, charging, LED bars |
| Grid        | violet | grid KPI, grid page, import / export, pylon and transformer |
| Campus load | blue   | consumption, buildings, load curves (also the platform's brand colour) |
| Soiling     | sand   | soiling page, dust on the 3D module and the module map |

Tariff windows use green (off-peak) / amber (day) / red (peak); weather icons follow the condition.

How it works:

- `src/lib/palette.ts` holds the hex values for everything that cannot read CSS (Three.js, Recharts) —
  `ENERGY`, `ASSET_ACCENT`, `TARIFF_COLOR` and `CHART`.
- In `src/app/globals.css`, an element with `data-accent="solar | battery | grid | load | dust"` (or `eco`, an
  alias of the battery green) re-maps the whole `brand-*` ramp inside it. Any component that uses
  `brand-*` utilities (cards, badges, gauges, chips…) therefore recolours itself when it is wrapped in a scope.
- To change a colour, edit the ramp in `globals.css` **and** the matching entry in `palette.ts`.

## Pages

| Route         | What it shows |
| ------------- | ------------- |
| `/`           | **Overview** — compact KPI strip and a full-height interactive **3D EMS model** (PV ⇄ battery ⇄ grid ⇄ campus load, animated flows that follow real-time data). **Hover** the PV field, the battery bank or the grid connection to get a static fact sheet; **click** one to open its detail page (on touch: tap once for the fact sheet, tap again to open). Below the fold: power balance, energy mix, autonomy & CO₂, daily power profile, system events, PV fleet table. |
| `/production` | **Energy production** — fleet KPIs, stacked power / cumulative-energy chart (all systems or a single one, measured vs forecast vs clear-sky), one card per PV system with real-time power, load gauge, today’s cumulative energy, 30-day and lifetime yield, performance ratio, specific yield, capacity factor, efficiency, irradiance, module temperature, inverter efficiency, availability — and its **configuration** (module technology, number of modules, strings and inverters), plus a performance comparison and a fleet configuration table. |
| `/soiling`    | **Module soiling** — fleet soiling, energy lost to dust and cleaning due; chips to pick a PV system; its **structure** (inverters → strings → modules) as a clickable module map tinted by each module's soiling; the selected module in a large **3D view** whose dust layer matches the measured loss (a faint haze at 1–2 %, a heavy brown film above 8 %, bird droppings where present, a "clean preview" toggle); a 30-day soiling chart (system, module, fleet, rain / sand-wind / cleaning events, 5 % threshold) and a cleaning plan. |
| `/battery`    | **Battery storage** — state of charge, power exchange, throughput and health, a dual-axis power / SOC chart with the off-peak window and the usable SOC band, one card per battery unit (SOC, temperature, state of health, cycles) and the dispatch strategy. |
| `/grid`       | **Grid connection** — live import / export, voltage, frequency and power factor, a signed import / export chart against the campus load, the tariff timeline (off-peak, day, peak) with energy per window, and a carbon-intensity card. |
| `/forecast`   | **Weather & PV forecast** — live conditions with sun path, solar resource (GHI/DNI/DHI), 7-day outlook, hourly PV forecast with P10–P90 range, irradiance / cloud / temperature / precipitation charts, hourly strip, planning insights and forecast-accuracy tracking. |

### Navigation

The sidebar is a slim icon rail by default so the 3D twin gets the whole width. Use the chevron on its edge
to open it as an overlay drawer (it closes on Escape, on a click outside, or after navigating); the page
underneath never reflows, so the 3D canvas keeps its size.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm run lint
```

Requires Node.js 20.9 or newer.

## Simulated data & the clock

All telemetry is **simulated** by a deterministic model (`src/lib/simulation.ts`) so the platform is fully
functional without any backend: clear-sky irradiance, seeded cloud events, per-system orientation and
temperature derating, inverter clipping, a campus load profile and a battery dispatch strategy
(self-consumption first, off-peak grid top-up between 22:00 and 06:00).

The top bar controls the simulated clock:

- **Live** — follows your wall-clock time.
- **×60 / ×300** — time-lapse (one simulated minute per second / five minutes per second). Default is ×60.
- Pause and scrub to any time of day (try 23:00 for night mode, 12:00 for peak production).

## Adapting it to a real site

1. **Site & equipment** — edit `src/lib/site.ts` (name, location, battery, grid connection) and
   `src/lib/pv-systems.ts`. Each PV system is described by its equipment — module technology
   (`TECHNOLOGIES`: efficiency and temperature coefficient), module power, number of strings and modules per
   string, inverter count and rating. Modules, DC capacity (kWp), AC limit and DC/AC ratio are derived from
   those figures, and the production model uses each technology's efficiency and temperature coefficient.
   The default site (Benguerir, Morocco, 2.2 MWp / 2.4 MWh / 2 MVA) is a placeholder.
2. **Telemetry** — the UI consumes the `Snapshot` and `DayModel` shapes from `src/lib/simulation.ts`
   through `LiveProvider` (`src/providers/live-provider.tsx`). Replace `getSnapshot` / `getDayModel` with calls
   to your SCADA, MQTT or REST source and keep the shapes — no component changes required.
3. **Weather** — `src/lib/weather.ts` exposes `getForecast`, `getCurrentConditions` and `getAccuracyHistory`.
   Swap them for a provider such as Open-Meteo, Solcast or Meteomatics.
4. **Soiling** — `src/lib/soiling.ts` simulates dust per system (daily rate, last cleaning, rain wash-off,
   sand-wind events) and per module (windward strings, string ends, bird droppings). Replace
   `getSystemSoiling` / `getModuleSoiling` with soiling-station or IV-curve measurements.

## Project structure

```
src/
  app/                    App Router pages (/, /production, /soiling, /battery, /grid, /forecast) + global styles
  components/
    ems/                  3D digital twin (React Three Fiber), label chips, hover / tap fact-sheet card
      scene/              platform, PV field, battery bank, grid pylon, campus, EMS hub, flow lines,
                          hotspots (invisible hit boxes + ground highlight for PV / battery / grid)
    soiling/              Soiling page (summary, system chips, module map, 3D module scene + canvas
                          textures per technology, soiling chart, cleaning plan)
    battery/              Battery page (summary, chart, unit cards, strategy)
    grid/                 Grid page (summary, chart, tariff timeline, carbon)
    overview/             Overview page cards
    production/           Production page (summary, chart, system cards, comparison)
    forecast/             Forecast page (conditions, outlook, charts, insights, accuracy)
    layout/               Sidebar, top bar, clock control
    ui/                   Design-system primitives (card, badge, gauges, sparkline, tooltip…) and
                          kpi-tile.tsx, the compact KPI tile shared by the top strip of every page
  hooks/                  Day-series sampling for sparklines
  lib/                    Site config, PV fleet, simulation, weather model, soiling model, formatting,
                          palette.ts (energy colours for 3D and charts),
                          assets.ts (fact-sheet content, battery units, tariff windows for PV / battery / grid)
  providers/              Simulated clock + snapshot context
```

## Performance notes

- The 3D scene never triggers React re-renders per frame: flow values are smoothed in refs and applied
  imperatively to instanced meshes (solar cells, battery LEDs, windows, flow particles) and canvas-generated
  textures. Rendering pauses while the scene is scrolled out of view.
- Live numbers tween by writing straight to the DOM (`AnimatedNumber`).
- Charts only rebuild their data when the simulated clock crosses a 10-minute boundary.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Three.js + React Three Fiber + drei ·
Recharts · lucide-react.
