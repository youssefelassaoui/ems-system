import * as THREE from "three";
import type { Anomaly } from "@/lib/inspection";
import {
  SUBSTRINGS,
  THIN_FILM_MARGIN,
  cellAt,
  cellRect,
  junctionBoxes,
  type CellLayout,
  type Rect,
} from "@/lib/module-layout";
import { gaussian, rng } from "@/lib/random";
import { paletteRgb, type ThermalPalette } from "./ironbow";

/* ------------------------------------------------------------------ */
/* Anomaly geometry                                                    */
/* ------------------------------------------------------------------ */

type Feature =
  | { kind: "cell"; c: number; r: number; amp: number }
  | { kind: "spot"; x: number; y: number; sx: number; sy: number; amp: number }
  | { kind: "rows"; r0: number; r1: number; amp: number }
  | { kind: "all"; amp: number };

function nearestCell(layout: CellLayout, x: number, y: number) {
  return {
    c: Math.min(layout.cols - 1, Math.max(0, Math.floor(x * layout.cols))),
    r: Math.min(layout.rows - 1, Math.max(0, Math.floor(y * layout.rows))),
  };
}

/** Where the anomaly heats the module. Shared by the thermal image and the detection marker. */
export function anomalyFeatures(layout: CellLayout, a: Anomaly): Feature[] {
  const rand = rng(a.seed);
  const thin = layout.style === "thinfilm";
  const dT = a.deltaT;
  const centre = cellAt(layout, a.x, a.y) ?? nearestCell(layout, a.x, a.y);

  switch (a.type) {
    case "hotCell":
      return thin
        ? [{ kind: "spot", x: a.x, y: a.y, sx: 0.006, sy: 0.09, amp: dT }]
        : [{ kind: "cell", ...centre, amp: dT }];
    case "multiCell": {
      const n = a.cells ?? 4;
      const out: Feature[] = [];
      for (let i = 0; i < n; i++) {
        // The first one is the hottest: it sets the reported ΔT.
        const amp = i === 0 ? dT : dT * (0.55 + 0.45 * rand());
        if (thin) out.push({ kind: "spot", x: 0.08 + 0.84 * rand(), y: 0.2 + 0.6 * rand(), sx: 0.006, sy: 0.08, amp });
        else out.push({ kind: "cell", c: Math.floor(rand() * layout.cols), r: Math.floor(rand() * layout.rows), amp });
      }
      return out;
    }
    case "diode": {
      const s = a.substring ?? 0;
      return [{ kind: "rows", r0: (s * layout.rows) / SUBSTRINGS, r1: ((s + 1) * layout.rows) / SUBSTRINGS, amp: dT }];
    }
    case "pid": {
      const out: Feature[] = [];
      let first = true;
      for (let c = 0; c < layout.cols; c++)
        for (let r = 0; r < layout.rows; r++) {
          const edge = r === 0 || r === layout.rows - 1 ? 0.6 : 1;
          const w = Math.exp(-c / (layout.cols * 0.13)) * (edge === 1 ? 0.85 : 1);
          if (rand() < w) {
            out.push({ kind: "cell", c, r, amp: first ? dT : dT * (0.45 + 0.55 * rand()) });
            first = false;
          }
        }
      return out;
    }
    case "junctionBox":
      return [
        { kind: "spot", x: a.x, y: a.y, sx: 0.018, sy: 0.036, amp: dT },
        { kind: "spot", x: a.x, y: a.y, sx: 0.07, sy: 0.12, amp: dT * 0.12 },
      ];
    case "shading":
      return thin
        ? [{ kind: "spot", x: a.x, y: a.y, sx: 0.012, sy: 0.024, amp: dT }]
        : [
            { kind: "spot", x: a.x, y: a.y, sx: 0.01, sy: 0.02, amp: dT * 0.7 },
            { kind: "cell", ...centre, amp: dT * 0.35 },
          ];
    case "crack": {
      const n = a.cells ?? 3;
      if (thin)
        return Array.from({ length: n }, (_, i) => ({
          kind: "spot" as const,
          x: a.x + (rand() - 0.5) * 0.08,
          y: a.y + (rand() - 0.5) * 0.16,
          sx: 0.01,
          sy: 0.03,
          amp: i === 0 ? dT : dT * (0.5 + 0.4 * rand()),
        }));
      const out: Feature[] = [{ kind: "cell", ...centre, amp: dT }];
      for (let i = 1; i < n; i++) {
        const c = Math.min(layout.cols - 1, Math.max(0, centre.c + Math.round((rand() - 0.5) * 3)));
        const r = Math.min(layout.rows - 1, Math.max(0, centre.r + Math.round((rand() - 0.5) * 2)));
        out.push({ kind: "cell", c, r, amp: dT * (0.55 + 0.4 * rand()) });
      }
      return out;
    }
    case "offline":
      return [{ kind: "all", amp: dT }];
  }
}

/** Box around the anomaly, normalised, padded. */
export function anomalyBounds(layout: CellLayout, a: Anomaly): Rect {
  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  const add = (r: Rect) => {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  };
  for (const f of anomalyFeatures(layout, a)) {
    if (f.kind === "cell") add(cellRect(layout, f.c, f.r));
    else if (f.kind === "spot" && f.amp > a.deltaT * 0.3) add({ x: f.x - 2.4 * f.sx, y: f.y - 2.4 * f.sy, w: 4.8 * f.sx, h: 4.8 * f.sy });
    else if (f.kind === "rows") {
      const top = layout.style === "thinfilm" ? f.r0 / layout.rows : cellRect(layout, 0, Math.floor(f.r0)).y;
      const bottom =
        layout.style === "thinfilm"
          ? f.r1 / layout.rows
          : cellRect(layout, 0, Math.ceil(f.r1) - 1).y + cellRect(layout, 0, 0).h;
      add({ x: 0.012, y: top, w: 0.976, h: bottom - top });
    } else if (f.kind === "all") add({ x: 0.006, y: 0.012, w: 0.988, h: 0.976 });
  }
  const padX = 0.012;
  const padY = 0.024;
  x0 = Math.max(0.004, x0 - padX);
  y0 = Math.max(0.008, y0 - padY);
  x1 = Math.min(0.996, x1 + padX);
  y1 = Math.min(0.992, y1 + padY);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** A healthy spot of the same module for the reference reading (none when the whole module is affected). */
export function referencePoint(layout: CellLayout, a: Anomaly): { x: number; y: number } | null {
  if (a.type === "offline") return null;
  let x = a.x < 0.5 ? 0.76 : 0.24;
  let y = a.y < 0.5 ? 0.66 : 0.34;
  if (a.type === "diode") {
    x = 0.3;
    y = (((a.substring ?? 0) + 1.5) % SUBSTRINGS) / SUBSTRINGS;
  }
  const cell = cellAt(layout, x, y);
  if (!cell) return { x, y };
  const r = cellRect(layout, cell.c, cell.r);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/* ------------------------------------------------------------------ */
/* Radiometric image                                                   */
/* ------------------------------------------------------------------ */

/** Module face in metres, so heat spread and edge effects have physical sizes. */
const FACE_W = 2.28;
const FACE_H = 1.13;
/** Resolution of the temperature field; it is upscaled with smoothing like a camera image. */
const FIELD_W = 448;
const FIELD_H = 224;

export interface ThermalField {
  /** Apparent temperature, °C, row-major FIELD_W × FIELD_H. */
  data: Float32Array;
  /** Hottest pixel of the anomaly, normalised (module centre when healthy). */
  peak: { x: number; y: number };
}

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

/** Separable box blur, in place (two passes ≈ the lens and detector blur of a thermal camera). */
function blur(src: Float32Array, w: number, h: number) {
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = x > 0 ? src[i - 1] : src[i];
      const r = x < w - 1 ? src[i + 1] : src[i];
      tmp[i] = (l + src[i] + r) / 3;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = y > 0 ? tmp[i - w] : tmp[i];
      const b = y < h - 1 ? tmp[i + w] : tmp[i];
      src[i] = (t + tmp[i] + b) / 3;
    }
}

/**
 * Apparent temperature of the module face during the flight: cooler edges near the frame, warmer
 * top and junction-box areas, cell-to-cell mismatch, cooler gaps, sky reflections in the glass,
 * then the anomaly, the camera blur and the sensor noise (NETD ≈ 50 mK, slight column pattern).
 */
export function createThermalField(layout: CellLayout, anomaly: Anomaly | null, baseTempC: number, seed: number): ThermalField {
  const thin = layout.style === "thinfilm";
  const rand = rng(seed * 31 + 7);
  const cellOffset = new Float32Array(Math.max(1, layout.cols * layout.rows));
  for (let i = 0; i < cellOffset.length; i++) cellOffset[i] = gaussian(rand) * 0.32;
  const gapCool = luminance(layout.backsheet) > 0.6 ? 1.7 : 0.8;
  const phase0 = rand() * Math.PI * 2;
  const phase1 = rand() * Math.PI * 2;
  const boxes = junctionBoxes(layout);

  const hot: { rect: Rect; amp: number; cx: number; cy: number }[] = [];
  const spots: Extract<Feature, { kind: "spot" }>[] = [];
  let band: { top: number; bottom: number; amp: number } | null = null;
  let whole = 0;
  if (anomaly) {
    const frand = rng(anomaly.seed + 17);
    for (const f of anomalyFeatures(layout, anomaly)) {
      if (f.kind === "cell") {
        const rect = cellRect(layout, f.c, f.r);
        const same = hot.find((h) => h.rect.x === rect.x && h.rect.y === rect.y);
        if (same) same.amp = Math.max(same.amp, f.amp);
        else hot.push({ rect, amp: f.amp, cx: rect.x + rect.w * (0.3 + 0.4 * frand()), cy: rect.y + rect.h * (0.3 + 0.4 * frand()) });
      } else if (f.kind === "spot") spots.push(f);
      else if (f.kind === "rows") {
        const top = thin ? f.r0 / layout.rows : cellRect(layout, 0, Math.floor(f.r0)).y - 0.002;
        const bottom = thin ? f.r1 / layout.rows : cellRect(layout, 0, Math.ceil(f.r1) - 1).y + cellRect(layout, 0, 0).h + 0.002;
        band = { top, bottom, amp: f.amp };
      } else whole = f.amp;
    }
  }
  const sigmaCore = 2 * 0.022 * 0.022;

  const data = new Float32Array(FIELD_W * FIELD_H);
  for (let py = 0; py < FIELD_H; py++) {
    const v = (py + 0.5) / FIELD_H;
    for (let px = 0; px < FIELD_W; px++) {
      const u = (px + 0.5) / FIELD_W;
      const xm = u * FACE_W;
      const ym = v * FACE_H;
      const edge = Math.min(xm, FACE_W - xm, ym, FACE_H - ym);
      let T =
        baseTempC -
        3.2 * Math.exp(-edge / 0.08) +
        1.5 * (0.5 - v) +
        0.45 * Math.sin(2.3 * u + 1.7 * v + phase0) +
        0.3 * Math.sin(3.1 * v - 1.4 * u + phase1);
      for (const b of boxes) {
        const dx = (u - b.x) / 0.05;
        const dy = (v - b.y) / 0.1;
        T += 1.6 * Math.exp(-(dx * dx + dy * dy) / 2);
      }

      if (thin) {
        const m = THIN_FILM_MARGIN;
        if (u < m.x || u > 1 - m.x || v < m.y || v > 1 - m.y) T -= 1.3;
        else if (((u * 2048) / 9.6) % 1 < 0.18) T -= 0.12;
      } else {
        const cell = cellAt(layout, u, v);
        if (!cell) T -= gapCool;
        else {
          const r = cellRect(layout, cell.c, cell.r);
          const dx = (u - r.x) / r.w - 0.5;
          const dy = (v - r.y) / r.h - 0.5;
          T += cellOffset[cell.c * layout.rows + cell.r] + 0.2 * (0.5 - 2 * (dx * dx + dy * dy));
        }
      }

      for (const h of hot) {
        const ex = Math.max(h.rect.x - u, 0, u - h.rect.x - h.rect.w) * FACE_W;
        const ey = Math.max(h.rect.y - v, 0, v - h.rect.y - h.rect.h) * FACE_H;
        if (ex === 0 && ey === 0) {
          const dx = (u - h.cx) * FACE_W;
          const dy = (v - h.cy) * FACE_H;
          T += h.amp * (0.7 + 0.3 * Math.exp(-(dx * dx + dy * dy) / sigmaCore));
        } else {
          // Heat conducted into the neighbouring cells.
          const e = Math.hypot(ex, ey);
          if (e < 0.15) T += h.amp * 0.16 * Math.exp(-e / 0.025);
        }
      }
      if (band && v >= band.top && v < band.bottom && u > 0.012 && u < 0.988) T += band.amp;
      if (whole) T += whole;
      for (const s of spots) {
        const dx = (u - s.x) / s.sx;
        const dy = (v - s.y) / s.sy;
        T += s.amp * Math.exp(-(dx * dx + dy * dy) / 2);
      }
      data[py * FIELD_W + px] = T;
    }
  }

  blur(data, FIELD_W, FIELD_H);
  blur(data, FIELD_W, FIELD_H);

  let peak = { x: 0.5, y: 0.5 };
  if (anomaly) {
    let best = -Infinity;
    for (let i = 0; i < data.length; i++)
      if (data[i] > best) {
        best = data[i];
        peak = { x: ((i % FIELD_W) + 0.5) / FIELD_W, y: (Math.floor(i / FIELD_W) + 0.5) / FIELD_H };
      }
  }

  const noise = rng(seed * 7 + 3);
  const column = new Float32Array(FIELD_W);
  for (let x = 0; x < FIELD_W; x++) column[x] = gaussian(noise) * 0.04;
  for (let i = 0; i < data.length; i++) data[i] += gaussian(noise) * 0.09 + column[i % FIELD_W];

  return { data, peak };
}

/** Colours a temperature field with a palette over a fixed span. */
export function createThermalTexture(field: ThermalField, range: { min: number; max: number }, palette: ThermalPalette) {
  const lut = new Uint8ClampedArray(1024 * 3);
  for (let i = 0; i < 1024; i++) {
    const [r, g, b] = paletteRgb(palette, i / 1023);
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  const small = document.createElement("canvas");
  small.width = FIELD_W;
  small.height = FIELD_H;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(FIELD_W, FIELD_H);
  const span = range.max - range.min;
  for (let i = 0; i < field.data.length; i++) {
    const k = Math.round(Math.min(1, Math.max(0, (field.data[i] - range.min) / span)) * 1023) * 3;
    img.data[i * 4] = lut[k];
    img.data[i * 4 + 1] = lut[k + 1];
    img.data[i * 4 + 2] = lut[k + 2];
    img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Measurement overlay                                                 */
/* ------------------------------------------------------------------ */

const TEX_W = 2048;
const TEX_H = 1024;
const MONO = "600 40px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** White line with a dark outline, readable on any palette. */
function outlined(ctx: CanvasRenderingContext2D, path: () => void, width = 4) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width + 5;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  path();
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = "#ffffff";
  path();
  ctx.stroke();
}

function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: "left" | "right", swatch?: string) {
  ctx.font = MONO;
  const pad = 14;
  const sw = swatch ? 32 : 0;
  const tw = ctx.measureText(text).width + pad * 2 + sw;
  const th = 56;
  const tx = Math.min(TEX_W - tw - 6, Math.max(6, align === "left" ? x : x - tw));
  const ty = Math.min(TEX_H - th - 6, Math.max(6, y));
  ctx.fillStyle = "rgba(8,8,12,0.68)";
  ctx.beginPath();
  ctx.roundRect(tx, ty, tw, th, 10);
  ctx.fill();
  if (swatch) {
    ctx.fillStyle = swatch;
    ctx.beginPath();
    ctx.roundRect(tx + pad, ty + th / 2 - 10, 20, 20, 4);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, tx + pad + sw, ty + th / 2 + 2);
}

function spotMeter(ctx: CanvasRenderingContext2D, label: string, x: number, y: number) {
  const R = 24;
  outlined(ctx, () => {
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.moveTo(x + dx * (R - 10), y + dy * (R - 10));
      ctx.lineTo(x + dx * (R + 20), y + dy * (R + 20));
    }
  });
  const right = x + R + 120 < TEX_W;
  tag(ctx, label, right ? x + R + 26 : x - R - 26, y - 28, right ? "left" : "right");
}

/**
 * Measurement tools drawn on the image, as in thermography software: Bx1 around the anomaly and,
 * on the thermal view, spot meters on the hottest pixel (Sp1) and on a healthy reference (Sp2).
 */
export function createMarkerTexture(
  layout: CellLayout,
  a: Anomaly,
  color: string,
  peak: { x: number; y: number } | null,
) {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  const b = anomalyBounds(layout, a);
  const x = b.x * TEX_W;
  const y = b.y * TEX_H;
  const w = b.w * TEX_W;
  const h = b.h * TEX_H;

  outlined(ctx, () => {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }, 3.5);
  const above = y - 66 > 6;
  tag(ctx, "Bx1", above ? x : x + 10, above ? y - 66 : y + 10, "left", color);

  if (peak) {
    spotMeter(ctx, "Sp1", peak.x * TEX_W, peak.y * TEX_H);
    const ref = referencePoint(layout, a);
    if (ref) spotMeter(ctx, "Sp2", ref.x * TEX_W, ref.y * TEX_H);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------------------------------------------ */
/* RGB                                                                 */
/* ------------------------------------------------------------------ */

/** Defects a normal camera can see: droppings, broken glass. Transparent elsewhere. */
export function createRgbDefectTexture(a: Anomaly | null) {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  if (a) {
    const rand = rng(a.seed + 99);
    const cx = a.x * W;
    const cy = a.y * H;
    if (a.type === "shading") {
      for (let i = 0; i < 9; i++) {
        const ang = rand() * Math.PI * 2;
        const d = rand() * 22;
        const r = 9 + rand() * 16;
        ctx.fillStyle = i === 0 ? "rgba(238,236,228,0.97)" : `rgba(${220 + rand() * 30},${214 + rand() * 30},${200 + rand() * 30},0.92)`;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(84,78,64,0.6)";
      ctx.beginPath();
      ctx.arc(cx + 4, cy - 3, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.type === "crack") {
      // Impact point with radial and ring fractures
      ctx.strokeStyle = "rgba(235,242,250,0.85)";
      ctx.lineCap = "round";
      const rays = 9 + Math.floor(rand() * 5);
      for (let i = 0; i < rays; i++) {
        let ang = (i / rays) * Math.PI * 2 + rand() * 0.4;
        let px = cx;
        let py = cy;
        const len = 60 + rand() * 170;
        ctx.lineWidth = 2.2 + rand() * 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let s = 0; s < 6; s++) {
          ang += (rand() - 0.5) * 0.5;
          px += Math.cos(ang) * (len / 6);
          py += Math.sin(ang) * (len / 6);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 1.6;
      for (const r of [22, 48, 80]) {
        ctx.beginPath();
        for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.35) {
          const rr = r * (0.85 + rand() * 0.3);
          const px = cx + Math.cos(t) * rr;
          const py = cy + Math.sin(t) * rr * 0.9;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 28, cy - 28, 56, 56);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
