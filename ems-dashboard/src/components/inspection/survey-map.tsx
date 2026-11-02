"use client";

import { useEffect, useRef, useState } from "react";
import { Drone } from "lucide-react";
import { PV_SYSTEMS } from "@/lib/pv-systems";
import { MISSION, getInspection, type Severity } from "@/lib/inspection";
import { moduleLayout } from "@/lib/soiling";
import { CELL_TONE, cellLayout } from "@/lib/module-layout";
import { rng } from "@/lib/random";
import { cn } from "@/lib/cn";
import { IRONBOW_CSS, ironbow } from "./ironbow";
import { SEVERITY_COLOR } from "./levels";

/* ------------------------------------------------------------------ */
/* Site and flight plan, in metres (x east, y south)                   */
/* ------------------------------------------------------------------ */

const BLOCK_W = 46;
const BLOCK_H = 30;
const COL_GAP = 9;
const ROW_GAP = 13;
const SITE_W = 3 * BLOCK_W + 2 * COL_GAP;
const SITE_H = 2 * BLOCK_H + ROW_GAP;
/** Each block: rows of 2-portrait tables, seen from above. */
const TABLE_ROWS = 4;
const TABLE_D = 3.9;
const ROW_PITCH = (BLOCK_H - TABLE_D) / (TABLE_ROWS - 1);
const MODULE_W = 1.13;
const FENCE = 6.5;
const ROAD_Y = BLOCK_H + ROW_GAP / 2;

/** Thermal footprint at 30 m: 640 × 512 px at 3.4 cm/px; lines spaced for 70 % side overlap. */
const FOOT_ACROSS = 21.8;
const FOOT_ALONG = 17.4;
const SPACING = FOOT_ACROSS * 0.3;
const RUN_IN = 9;
const HOME = { x: -17, y: SITE_H + 9 };
const VIEW = { x0: -27, y0: -13, x1: SITE_W + 20, y1: SITE_H + 17 };

/** Replay timing, s. */
const FLY_S = 42;
const HOLD_S = 4;

const blockOrigin = (i: number) => ({ x: (i % 3) * (BLOCK_W + COL_GAP), y: Math.floor(i / 3) * (BLOCK_H + ROW_GAP) });

interface Pt {
  x: number;
  y: number;
}
interface SurveyLine {
  y: number;
  x0: number;
  x1: number;
  /** Distance along the route where the line starts and ends. */
  s0: number;
  s1: number;
}
interface FlightPlan {
  pts: Pt[];
  cum: number[];
  length: number;
  lines: SurveyLine[];
  surveyLength: number;
}

/** Lawnmower pattern along the table rows, with U-turns outside the fence, from and back to home. */
function flightPlan(): FlightPlan {
  const n = Math.ceil(SITE_H / SPACING) + 1;
  const y0 = (SITE_H - (n - 1) * SPACING) / 2;
  const pts: Pt[] = [{ ...HOME }];
  const specs: { a: number; b: number; y: number; x0: number; x1: number }[] = [];
  for (let k = 0; k < n; k++) {
    const y = y0 + k * SPACING;
    const east = k % 2 === 0;
    const x0 = east ? -RUN_IN : SITE_W + RUN_IN;
    const x1 = east ? SITE_W + RUN_IN : -RUN_IN;
    pts.push({ x: x0, y }, { x: x1, y });
    specs.push({ a: pts.length - 2, b: pts.length - 1, y, x0, x1 });
    if (k < n - 1) {
      const r = SPACING / 2;
      for (let j = 1; j < 12; j++) {
        const t = -Math.PI / 2 + (j / 12) * Math.PI;
        pts.push({ x: x1 + (east ? 1 : -1) * r * Math.cos(t), y: y + r + r * Math.sin(t) });
      }
    }
  }
  pts.push({ ...HOME });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const lines = specs.map((l) => ({ y: l.y, x0: l.x0, x1: l.x1, s0: cum[l.a], s1: cum[l.b] }));
  return { pts, cum, length: cum[cum.length - 1], lines, surveyLength: lines.reduce((s, l) => s + l.s1 - l.s0, 0) };
}

function positionAt(plan: FlightPlan, s: number) {
  let lo = 0;
  let hi = plan.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (plan.cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = plan.pts[lo];
  const b = plan.pts[hi];
  const f = Math.min(1, Math.max(0, (s - plan.cum[lo]) / (plan.cum[hi] - plan.cum[lo] || 1)));
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, heading: Math.atan2(b.y - a.y, b.x - a.x), i: lo };
}

interface Target {
  x: number;
  y: number;
  severity: Severity;
  deltaT: number;
  /** Route distance at which the camera footprint first covers it. */
  s: number;
}

/** Every anomaly of the inspection, placed on its block, with the moment the drone sees it. */
function flightTargets(plan: FlightPlan): Target[] {
  const nMod = Math.floor(BLOCK_W / MODULE_W);
  const off = (BLOCK_W - nMod * MODULE_W) / 2;
  return PV_SYSTEMS.flatMap((cfg, i) => {
    const o = blockOrigin(i);
    const { stringsPerInverter } = moduleLayout(cfg);
    return getInspection(i).anomalies.map((a) => {
      const gs = Math.min(cfg.stringCount - 1, a.ref.inverter * stringsPerInverter + a.ref.string);
      const rowF = ((gs + 0.5) / cfg.stringCount) * TABLE_ROWS;
      const k = Math.min(TABLE_ROWS - 1, Math.floor(rowF));
      const line = Math.min(1, Math.floor((rowF - k) * 2));
      const col = Math.min(nMod - 1, Math.floor(((a.ref.module + 0.5) / cfg.modulesPerString) * nMod));
      const x = o.x + off + (col + 0.5) * MODULE_W;
      const y = o.y + k * ROW_PITCH + (line + 0.5) * (TABLE_D / 2);
      let s = plan.length;
      for (const l of plan.lines) {
        if (Math.abs(y - l.y) > FOOT_ACROSS / 2) continue;
        const dir = Math.sign(l.x1 - l.x0);
        s = l.s0 + Math.max(0, (x - (dir * FOOT_ALONG) / 2 - l.x0) * dir);
        break;
      }
      return { x, y, severity: a.severity, deltaT: a.deltaT, s };
    });
  });
}

/* ------------------------------------------------------------------ */
/* Orthophoto and thermal mosaic                                       */
/* ------------------------------------------------------------------ */

interface Fit {
  k: number;
  ox: number;
  oy: number;
}

function fitView(w: number, h: number): Fit {
  const top = 46;
  const bottom = 52;
  const side = 10;
  const vw = VIEW.x1 - VIEW.x0;
  const vh = VIEW.y1 - VIEW.y0;
  const k = Math.max(0.5, Math.min((w - 2 * side) / vw, (h - top - bottom) / vh));
  return { k, ox: (w - k * vw) / 2 - k * VIEW.x0, oy: top + (h - top - bottom - k * vh) / 2 - k * VIEW.y0 };
}

function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < 4; o++) {
    s += amp * noise2(x * f, y * f, seed + o * 17);
    f *= 2;
    amp *= 0.5;
  }
  return s / 0.9375;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = ([r, g, b]: number[], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const ir = (t: number, a = 1) => css(ironbow(t), a);

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Pre-renders the site twice: as an RGB orthophoto and as the radiometric mosaic. */
function renderLayers(w: number, h: number, dpr: number, f: Fit, targets: Target[]) {
  const W = Math.round(w * dpr);
  const H = Math.round(h * dpr);
  const rgb = makeCanvas(W, H);
  const therm = makeCanvas(W, H);
  const rc = rgb.getContext("2d")!;
  const tc = therm.getContext("2d")!;

  // Ground: sand with darker patches and sparse vegetation, sampled at half resolution.
  const gw = Math.ceil(w / 2);
  const gh = Math.ceil(h / 2);
  const g1 = makeCanvas(gw, gh);
  const g2 = makeCanvas(gw, gh);
  const c1 = g1.getContext("2d")!;
  const c2 = g2.getContext("2d")!;
  const d1 = c1.createImageData(gw, gh);
  const d2 = c2.createImageData(gw, gh);
  for (let py = 0; py < gh; py++)
    for (let px = 0; px < gw; px++) {
      const wx = (px * 2 + 1 - f.ox) / f.k;
      const wy = (py * 2 + 1 - f.oy) / f.k;
      const n = fbm(wx / 26, wy / 26, 11);
      const m = fbm(wx / 6, wy / 6, 29);
      const shade = 0.8 + 0.32 * n + 0.1 * (m - 0.5);
      const olive = smoothstep(0.62, 0.8, m) * 0.45;
      const i = (py * gw + px) * 4;
      d1.data[i] = (201 * (1 - olive) + 132 * olive) * shade;
      d1.data[i + 1] = (180 * (1 - olive) + 130 * olive) * shade;
      d1.data[i + 2] = (140 * (1 - olive) + 92 * olive) * shade;
      d1.data[i + 3] = 255;
      const [r, g, b] = ironbow(0.25 + (n - 0.5) * 0.3 + (m - 0.5) * 0.1 - olive * 0.12);
      d2.data[i] = r;
      d2.data[i + 1] = g;
      d2.data[i + 2] = b;
      d2.data[i + 3] = 255;
    }
  c1.putImageData(d1, 0, 0);
  c2.putImageData(d2, 0, 0);
  for (const [ctx, src] of [
    [rc, g1],
    [tc, g2],
  ] as const) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, W, H);
  }
  // Gravel grain
  const grain = rng(5);
  for (let i = 0; i < W * H * 0.014; i++) {
    const x = grain() * W;
    const y = grain() * H;
    const light = grain() < 0.5;
    rc.fillStyle = light ? "rgba(255,248,228,0.2)" : "rgba(58,46,30,0.18)";
    rc.fillRect(x, y, dpr, dpr);
    tc.fillStyle = light ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    tc.fillRect(x, y, dpr, dpr);
  }

  const world = (ctx: CanvasRenderingContext2D) => ctx.setTransform(dpr * f.k, 0, 0, dpr * f.k, dpr * f.ox, dpr * f.oy);
  world(rc);
  world(tc);
  const px = 1 / (dpr * f.k);
  const both = (draw: (ctx: CanvasRenderingContext2D, thermal: boolean) => void) => {
    draw(rc, false);
    draw(tc, true);
  };

  // Shrubs outside the fence
  const shrubs = rng(77);
  for (let i = 0; i < 110; i++) {
    const x = VIEW.x0 - 12 + shrubs() * (VIEW.x1 - VIEW.x0 + 24);
    const y = VIEW.y0 - 12 + shrubs() * (VIEW.y1 - VIEW.y0 + 24);
    const r = 0.5 + shrubs() * 1.1;
    const tone = shrubs();
    if (x > -FENCE - 3 && x < SITE_W + FENCE + 3 && y > -FENCE - 3 && y < SITE_H + FENCE + 3) continue;
    if (Math.abs(y - ROAD_Y) < 4 || (Math.abs(x - HOME.x) < 6 && y > ROAD_Y)) continue;
    rc.fillStyle = "rgba(52,40,24,0.35)";
    rc.beginPath();
    rc.ellipse(x + 0.35, y - 0.75, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
    rc.fill();
    rc.fillStyle = css([88 + tone * 26, 94 + tone * 18, 60 + tone * 10]);
    tc.fillStyle = ir(0.15 + tone * 0.04);
    for (const ctx of [rc, tc]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gravel roads: perimeter, central road, lanes between blocks, access road and the take-off pad.
  both((ctx, thermal) => {
    ctx.fillStyle = thermal ? ir(0.4) : "rgb(216,203,176)";
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 3.4;
    ctx.strokeRect(-3.2, -3.2, SITE_W + 6.4, SITE_H + 6.4);
    ctx.fillRect(VIEW.x0 - 30, ROAD_Y - 2, SITE_W + 3.2 - (VIEW.x0 - 30), 4);
    for (let c = 1; c < 3; c++) ctx.fillRect(c * (BLOCK_W + COL_GAP) - COL_GAP / 2 - 1.5, -3.2, 3, SITE_H + 6.4);
    ctx.fillRect(HOME.x - 1.5, ROAD_Y, 3, HOME.y - ROAD_Y);
    ctx.fillStyle = thermal ? ir(0.46) : "rgb(206,206,200)";
    ctx.fillRect(HOME.x - 3.2, HOME.y - 3.2, 6.4, 6.4);
  });

  // Fence
  both((ctx, thermal) => {
    ctx.setLineDash([1.4, 0.9]);
    ctx.lineWidth = Math.max(0.25, px * 1.2);
    ctx.strokeStyle = thermal ? ir(0.12, 0.9) : "rgba(78,70,58,0.8)";
    ctx.strokeRect(-FENCE, -FENCE, SITE_W + 2 * FENCE, SITE_H + 2 * FENCE);
    ctx.setLineDash([]);
  });

  // PV blocks
  const nMod = Math.floor(BLOCK_W / MODULE_W);
  const off = (BLOCK_W - nMod * MODULE_W) / 2;
  PV_SYSTEMS.forEach((cfg, i) => {
    const o = blockOrigin(i);
    const tone = hexRgb(CELL_TONE[cellLayout(cfg.technology.short).style]);
    const base = tone.map((c, j) => c * 0.68 + [66, 78, 96][j] * 0.32);
    const { stringsPerInverter } = moduleLayout(cfg);
    const offline = getInspection(i).offlineInverters;
    const jitter = rng(i * 131 + 7);
    for (let k = 0; k < TABLE_ROWS; k++) {
      const y = o.y + k * ROW_PITCH;
      // Shadow towards the north, then the mounting structure seen through the module gaps.
      rc.fillStyle = "rgba(46,36,24,0.45)";
      rc.fillRect(o.x + off + 0.3, y - 1.5, nMod * MODULE_W, 1.6);
      tc.fillStyle = ir(0.13);
      tc.fillRect(o.x + off + 0.3, y - 1.5, nMod * MODULE_W, 1.6);
      rc.fillStyle = "rgb(58,62,70)";
      rc.fillRect(o.x + off, y, nMod * MODULE_W, TABLE_D);
      tc.fillStyle = ir(0.36);
      tc.fillRect(o.x + off, y, nMod * MODULE_W, TABLE_D);
      for (let line = 0; line < 2; line++) {
        const ly = y + line * (TABLE_D / 2);
        const gs = Math.floor(((k * 2 + line + 0.5) / (TABLE_ROWS * 2)) * cfg.stringCount);
        const warm = offline.includes(Math.floor(gs / stringsPerInverter)) ? 0.07 : 0;
        for (let m = 0; m < nMod; m++) {
          const x = o.x + off + m * MODULE_W;
          const v = 1 + (jitter() - 0.5) * 0.12 + line * 0.05;
          rc.fillStyle = css(base.map((c) => c * v));
          rc.fillRect(x + px * 0.5, ly + px * 0.5, MODULE_W - px, TABLE_D / 2 - px);
          tc.fillStyle = ir(0.53 + (jitter() - 0.5) * 0.05 + line * 0.012 + warm);
          tc.fillRect(x + px * 0.5, ly + px * 0.5, MODULE_W - px, TABLE_D / 2 - px);
        }
      }
      rc.fillStyle = "rgba(226,232,240,0.4)";
      rc.fillRect(o.x + off, y, nMod * MODULE_W, px);
    }
    // Inverter station next to the central road (warm on the thermal mosaic).
    const sx = o.x + BLOCK_W - 7;
    const sy = i < 3 ? BLOCK_H + 1.1 : BLOCK_H + ROW_GAP - 1.1 - 2.4;
    rc.fillStyle = "rgba(40,32,22,0.45)";
    rc.fillRect(sx + 0.5, sy - 0.9, 4, 2.4);
    rc.fillStyle = "rgb(234,236,239)";
    rc.fillRect(sx, sy, 4, 2.4);
    rc.fillStyle = "rgba(0,0,0,0.12)";
    rc.fillRect(sx, sy + 1.2 - px / 2, 4, px);
    tc.fillStyle = ir(0.82);
    tc.fillRect(sx, sy, 4, 2.4);
  });

  // Anomalies are hot spots on the mosaic only.
  for (const t of targets) {
    tc.fillStyle = ir(0.64 + Math.min(0.26, t.deltaT / 70));
    tc.fillRect(t.x - MODULE_W / 2 + px * 0.5, t.y - TABLE_D / 4 + px * 0.5, MODULE_W - px, TABLE_D / 2 - px);
    tc.fillStyle = ir(Math.min(1, 0.82 + t.deltaT / 90));
    tc.beginPath();
    tc.arc(t.x, t.y, 0.45, 0, Math.PI * 2);
    tc.fill();
  }

  // Block labels
  for (const ctx of [rc, tc]) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "600 10px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 3;
    ctx.fillStyle = "#ffffff";
    PV_SYSTEMS.forEach((cfg, i) => {
      const o = blockOrigin(i);
      ctx.fillText(cfg.short, f.ox + f.k * (o.x + off), f.oy + f.k * (o.y - 1.8));
    });
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  return { rgb, therm };
}

/* ------------------------------------------------------------------ */
/* Live layer                                                          */
/* ------------------------------------------------------------------ */

function drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, spin: number) {
  const arm = 9.5;
  const rotor = 6.6;
  const shape = (fill: string, withRotors: boolean) => {
    ctx.save();
    ctx.rotate(heading);
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const a of [45, 135, 225, 315]) {
      const r = (a * Math.PI) / 180;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(r) * arm, Math.sin(r) * arm);
    }
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(-7, -4.6, 14, 9.2, 3.2);
    ctx.fill();
    if (withRotors) {
      for (const [i, a] of [45, 135, 225, 315].entries()) {
        const r = (a * Math.PI) / 180;
        const cx = Math.cos(r) * arm;
        const cy = Math.sin(r) * arm;
        ctx.fillStyle = "rgba(210,215,222,0.2)";
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(cx, cy, rotor, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const b = spin * (i % 2 ? -1 : 1) + i;
        ctx.strokeStyle = "rgba(20,22,26,0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(b) * rotor * 0.9, cy + Math.sin(b) * rotor * 0.9);
        ctx.lineTo(cx - Math.cos(b) * rotor * 0.9, cy - Math.sin(b) * rotor * 0.9);
        ctx.stroke();
        ctx.fillStyle = "#16191e";
        ctx.beginPath();
        ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
        ctx.fill();
        // Navigation lights: red at the front, green at the rear.
        ctx.fillStyle = Math.cos(r) > 0 ? "#ff4d4d" : "#3ee07a";
        ctx.beginPath();
        ctx.arc(cx * 0.72, cy * 0.72, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body highlight and the gimbal at the nose.
      const g = ctx.createLinearGradient(0, -4.6, 0, 4.6);
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-7, -4.6, 14, 9.2, 3.2);
      ctx.fill();
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(7.4, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  // Shadow on the ground (the drone flies 30 m up, the sun is high in the south).
  ctx.save();
  ctx.translate(x + 4, y - 9);
  ctx.globalAlpha = 0.28;
  shape("#1c140a", false);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  shape("#2a2f37", true);
  ctx.restore();
}

const TELEMETRY = ["time", "alt", "spd", "img", "det", "done"] as const;

const toSeconds = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) * 60;
};
const clock = (s: number) => {
  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  return `${pad(s / 3600)}:${pad((s / 60) % 60)}:${pad(s % 60)}`;
};

/**
 * Replay of the survey flight on an orthophoto of the plant: the planned lawnmower route, the drone
 * and its thermal footprint, the radiometric mosaic building up behind it and each detection as the
 * camera passes over it.
 */
export function SurveyMap({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pxPerMetre, setPxPerMetre] = useState(2);

  useEffect(() => {
    const el = box.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const readout = Object.fromEntries(TELEMETRY.map((k) => [k, el.querySelector<HTMLElement>(`[data-tele="${k}"]`)])) as Record<
      (typeof TELEMETRY)[number],
      HTMLElement | null
    >;
    const plan = flightPlan();
    const targets = flightTargets(plan);
    const total = targets.length;
    const start = toSeconds(MISSION.start);
    const duration = toSeconds(MISSION.end) - start;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let fit: Fit = { k: 1, ox: 0, oy: 0 };
    let layers: ReturnType<typeof renderLayers> | null = null;
    let raf = 0;
    let last = 0;
    let elapsed = reduce ? FLY_S : 0;
    let heading = 0;
    let lastTele = 0;
    let visible = true;

    const X = (x: number) => fit.ox + fit.k * x;
    const Y = (y: number) => fit.oy + fit.k * y;

    const draw = (s: number, now: number) => {
      if (!layers) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layers.rgb, 0, 0, w, h);

      // Radiometric mosaic wherever the camera has already looked.
      ctx.save();
      ctx.beginPath();
      let any = false;
      for (const l of plan.lines) {
        if (s <= l.s0) break;
        const xe = l.x0 + (l.x1 - l.x0) * Math.min(1, (s - l.s0) / (l.s1 - l.s0));
        const xa = Math.min(l.x0, xe) - FOOT_ALONG / 2;
        const xb = Math.max(l.x0, xe) + FOOT_ALONG / 2;
        ctx.rect(X(xa), Y(l.y - FOOT_ACROSS / 2), fit.k * (xb - xa), fit.k * FOOT_ACROSS);
        any = true;
      }
      if (any) {
        ctx.clip();
        ctx.drawImage(layers.therm, 0, 0, w, h);
      }
      ctx.restore();

      // Planned route, then the part already flown.
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const trace = (upTo: number) => {
        ctx.beginPath();
        ctx.moveTo(X(plan.pts[0].x), Y(plan.pts[0].y));
        for (let i = 1; i <= upTo; i++) ctx.lineTo(X(plan.pts[i].x), Y(plan.pts[i].y));
      };
      trace(plan.pts.length - 1);
      ctx.setLineDash([2.5, 3.5]);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      const pos = positionAt(plan, s);
      trace(pos.i);
      ctx.lineTo(X(pos.x), Y(pos.y));
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      // Waypoints at the ends of the survey lines.
      for (const l of plan.lines)
        for (const [x, passed] of [
          [l.x0, s >= l.s0],
          [l.x1, s >= l.s1],
        ] as const) {
          ctx.beginPath();
          ctx.arc(X(x), Y(l.y), 1.8, 0, Math.PI * 2);
          ctx.fillStyle = passed ? "#ffffff" : "rgba(14,16,20,0.75)";
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = passed ? "rgba(14,16,20,0.6)" : "rgba(255,255,255,0.85)";
          ctx.stroke();
        }

      // Take-off point
      ctx.beginPath();
      ctx.arc(X(HOME.x), Y(HOME.y), 6.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,16,20,0.8)";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 8px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", X(HOME.x), Y(HOME.y) + 0.5);
      ctx.textAlign = "start";

      // Detections, pinged when the footprint reaches them.
      const speed = plan.length / FLY_S;
      let seen = 0;
      for (const t of targets) {
        if (s < t.s) continue;
        seen++;
        const tx = X(t.x);
        const ty = Y(t.y);
        const color = SEVERITY_COLOR[t.severity];
        const age = (s - t.s) / speed;
        if (age < 1.4 && s < plan.length) {
          ctx.beginPath();
          ctx.arc(tx, ty, 3.5 + age * 9, 0, Math.PI * 2);
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = css(hexRgb(color), 1 - age / 1.4);
          ctx.stroke();
        }
        const major = t.severity === "critical" || t.severity === "high";
        ctx.beginPath();
        ctx.arc(tx, ty, major ? 2.7 : 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = major ? 1.1 : 0.8;
        ctx.strokeStyle = major ? "#ffffff" : "rgba(0,0,0,0.55)";
        ctx.stroke();
      }

      // Camera footprint and the drone.
      const surveying = plan.lines.some((l) => s >= l.s0 && s <= l.s1);
      const flying = s > 0 && s < plan.length;
      const dx = X(pos.x);
      const dy = Y(pos.y);
      if (flying) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(heading);
        const a = fit.k * FOOT_ALONG;
        const b = fit.k * FOOT_ACROSS;
        ctx.fillStyle = surveying ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)";
        ctx.fillRect(-a / 2, -b / 2, a, b);
        ctx.lineWidth = 1;
        ctx.strokeStyle = surveying ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)";
        ctx.strokeRect(-a / 2, -b / 2, a, b);
        ctx.lineWidth = 2;
        const c = Math.min(7, a / 4);
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          ctx.beginPath();
          ctx.moveTo((sx * a) / 2, (sy * b) / 2 - sy * c);
          ctx.lineTo((sx * a) / 2, (sy * b) / 2);
          ctx.lineTo((sx * a) / 2 - sx * c, (sy * b) / 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      drawDrone(ctx, dx, dy, heading, now * 38);

      // Telemetry, a few times per second.
      if (now - lastTele > 0.12 || reduce) {
        lastTele = now;
        const done = plan.lines.reduce((sum, l) => sum + Math.min(l.s1 - l.s0, Math.max(0, s - l.s0)), 0);
        const transit = s < plan.lines[0].s0 || s > plan.lines[plan.lines.length - 1].s1;
        const speedMs = !flying ? 0 : surveying ? MISSION.speedMs : transit ? 7.5 : 2.8;
        if (readout.time) readout.time.textContent = clock(start + (s / plan.length) * duration);
        if (readout.alt) readout.alt.textContent = (flying ? MISSION.altitudeM + Math.sin(now * 0.8) * 0.15 : 0).toFixed(1);
        if (readout.spd) readout.spd.textContent = speedMs.toFixed(1);
        if (readout.img) readout.img.textContent = Math.round((done / plan.surveyLength) * MISSION.images).toLocaleString("en-US");
        if (readout.det) readout.det.textContent = `${seen}/${total}`;
        if (readout.done) readout.done.style.opacity = s >= plan.length ? "1" : "0";
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      elapsed += dt;
      if (elapsed > FLY_S + HOLD_S) elapsed = 0;
      const s = (Math.min(elapsed, FLY_S) / FLY_S) * plan.length;
      const target = positionAt(plan, Math.min(plan.length - 0.01, s + 0.5)).heading;
      const turn = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
      heading += turn * Math.min(1, dt * 8);
      draw(s, now / 1000);
      raf = requestAnimationFrame(frame);
    };
    const play = () => {
      if (raf || reduce || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      fit = fitView(w, h);
      layers = renderLayers(w, h, dpr, fit, targets);
      setPxPerMetre(fit.k);
      draw((Math.min(elapsed, FLY_S) / FLY_S) * plan.length, performance.now() / 1000);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      play();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", play);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", play);
    };
  }, []);

  const chip = "rounded-lg bg-black/50 ring-1 ring-inset ring-white/10 backdrop-blur-md";

  return (
    <div ref={box} className={cn("relative overflow-hidden bg-[#c3ad87]", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" role="img" aria-label="Replay of the drone survey flight over the PV plant" />

      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(chip, "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white")}>
            <Drone className="size-3.5" />
            Drone survey
          </span>
          <span className={cn(chip, "hidden px-2 py-1.5 font-mono text-[10.5px] text-white/80 sm:inline")}>
            AGL {MISSION.altitudeM} m · 70 % sidelap
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(chip, "hidden items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] text-white/80 sm:inline-flex")}>
            <span className="h-1.5 w-6 rounded-full" style={{ background: IRONBOW_CSS }} />
            IR mosaic
          </span>
          <span className={cn(chip, "grid size-[30px] place-items-center text-white")} aria-label="North">
            <svg viewBox="0 0 16 20" className="h-4 w-3.5" aria-hidden>
              <path d="M8 1 L13 13 L8 10.5 L3 13 Z" fill="currentColor" />
              <text x="8" y="19.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
                N
              </text>
            </svg>
          </span>
        </div>
      </div>

      <div
        data-tele="done"
        className={cn(chip, "pointer-events-none absolute left-1/2 top-14 -translate-x-1/2 px-3 py-1.5 text-[11.5px] font-semibold text-white opacity-0 transition-opacity duration-500")}
      >
        Survey complete · mosaic stitched
      </div>

      <div className="pointer-events-none absolute bottom-[52px] right-4 flex flex-col items-end gap-0.5 font-mono text-[10px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
        20 m
        <span className="h-1.5 border-x-2 border-b-2 border-white shadow-[0_1px_2px_rgba(0,0,0,0.5)]" style={{ width: pxPerMetre * 20 }} />
      </div>

      <div className={cn(chip, "pointer-events-none absolute inset-x-3 bottom-3 flex items-center gap-x-3.5 overflow-hidden whitespace-nowrap bg-black/60 px-3 py-2 font-mono text-[10.5px] text-white/55")}>
        <span className="flex items-center gap-1.5 font-semibold text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          REPLAY
        </span>
        <span data-tele="time" className="font-semibold text-white">
          {MISSION.start}:00
        </span>
        <span>
          ALT <b data-tele="alt" className="font-semibold text-white">0.0</b> m
        </span>
        <span className="hidden sm:inline">
          SPD <b data-tele="spd" className="font-semibold text-white">0.0</b> m/s
        </span>
        <span className="hidden sm:inline">
          IMG <b data-tele="img" className="font-semibold text-white">0</b>
        </span>
        <span>
          DET <b data-tele="det" className="font-semibold text-white">0</b>
        </span>
      </div>
    </div>
  );
}
