/** Colour palettes of radiometric cameras, as stops [t, r, g, b]. */
type Stops = [number, number, number, number][];

export type ThermalPalette = "ironbow" | "rainbow" | "whiteHot";

const STOPS: Record<ThermalPalette, Stops> = {
  ironbow: [
    [0, 0, 0, 12],
    [0.08, 22, 4, 74],
    [0.2, 72, 6, 140],
    [0.33, 138, 16, 154],
    [0.45, 190, 36, 120],
    [0.57, 225, 70, 58],
    [0.68, 242, 112, 20],
    [0.8, 251, 168, 18],
    [0.9, 254, 216, 72],
    [1, 255, 252, 232],
  ],
  rainbow: [
    [0, 8, 0, 48],
    [0.12, 34, 26, 160],
    [0.26, 0, 112, 224],
    [0.4, 0, 186, 196],
    [0.52, 26, 196, 82],
    [0.64, 172, 214, 18],
    [0.76, 255, 196, 0],
    [0.88, 255, 92, 0],
    [0.96, 230, 20, 20],
    [1, 255, 236, 236],
  ],
  whiteHot: [
    [0, 8, 8, 10],
    [1, 250, 250, 248],
  ],
};

export const PALETTE_LABEL: Record<ThermalPalette, string> = {
  ironbow: "Ironbow",
  rainbow: "Rainbow HC",
  whiteHot: "White hot",
};

export const PALETTES = Object.keys(STOPS) as ThermalPalette[];

export function paletteRgb(palette: ThermalPalette, t: number): [number, number, number] {
  const stops = STOPS[palette];
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    const [p1, r1, g1, b1] = stops[i];
    if (x <= p1) {
      const [p0, r0, g0, b0] = stops[i - 1];
      const k = (x - p0) / (p1 - p0);
      return [r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k];
    }
  }
  const [, r, g, b] = stops[stops.length - 1];
  return [r, g, b];
}

export const paletteCss = (palette: ThermalPalette, t: number) => {
  const [r, g, b] = paletteRgb(palette, t);
  return `rgb(${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`;
};

export const paletteHex = (palette: ThermalPalette, t: number) =>
  `#${paletteRgb(palette, t)
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;

/** CSS gradient of a palette; `to top` for vertical scale bars. */
export const paletteGradient = (palette: ThermalPalette, direction = "90deg") =>
  `linear-gradient(${direction}, ${STOPS[palette].map(([p, r, g, b]) => `rgb(${r},${g},${b}) ${p * 100}%`).join(", ")})`;

export const ironbow = (t: number) => paletteRgb("ironbow", t);
export const ironbowCss = (t: number) => paletteCss("ironbow", t);
export const IRONBOW_CSS = paletteGradient("ironbow");

/**
 * Temperature span of a thermal image, like a thermographer's manual level/span:
 * healthy cells sit low in the palette, big hotspots saturate to white.
 */
export function thermalRange(refTempC: number, maxTempC?: number) {
  const rise = Math.max(0, (maxTempC ?? refTempC) - refTempC);
  return { min: Math.floor(refTempC - 8), max: Math.ceil(refTempC + Math.min(20, Math.max(14, rise + 3))) };
}
