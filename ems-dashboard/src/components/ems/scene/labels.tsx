"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NODE } from "./types";

type P3 = [number, number, number];

export interface LabelAnchor {
  id: "pv" | "battery" | "grid" | "campus" | "hub";
  /** Where the leader line touches the asset. */
  base: P3;
  /** Where the floating chip hovers. */
  top: P3;
}

export const LABEL_ANCHORS: readonly LabelAnchor[] = [
  { id: "pv", base: [NODE.pv[0], 0.95, NODE.pv[2]], top: [NODE.pv[0], 2.9, NODE.pv[2]] },
  { id: "battery", base: [NODE.battery[0], 1.5, NODE.battery[2]], top: [NODE.battery[0], 3.2, NODE.battery[2]] },
  { id: "grid", base: [NODE.grid[0], 1.45, NODE.grid[2]], top: [NODE.grid[0] - 0.5, 3.1, NODE.grid[2]] },
  { id: "campus", base: [NODE.campus[0], 1.85, NODE.campus[2]], top: [NODE.campus[0], 3.4, NODE.campus[2]] },
  { id: "hub", base: [0, 2.7, 0], top: [0, 3.9, 0] },
];

export type LabelRefs = RefObject<Partial<Record<LabelAnchor["id"], HTMLElement | null>>>;

/** Below this canvas width the chips switch to their compact layout. */
const COMPACT_WIDTH = 640;

/**
 * The hero's title block (badge, heading, subtitle) is overlaid on the canvas's top-left corner from
 * the `sm` breakpoint up. Chips drifting towards it are eased below it, over `TITLE_EASE` pixels.
 */
const TITLE_MIN_CANVAS = 600;
const TITLE_WIDTH = 320;
const TITLE_HEIGHT = 128;
const TITLE_EASE = 48;

interface Item {
  id: LabelAnchor["id"];
  el: HTMLElement;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  s: number;
  dist: number;
  behind: boolean;
}

interface Box {
  w: number;
  h: number;
  at: number;
}

/**
 * Projects each 3D anchor to screen space every frame and moves the matching
 * DOM chip with a CSS transform. Overlapping chips are eased apart vertically
 * and each keeps a leader line pointing at its asset.
 * Content stays in the normal React tree.
 */
export function LabelProjector({ labelsRef }: { labelsRef: LabelRefs }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const offsets = useRef<Record<string, number>>({});
  const boxes = useRef<Record<string, Box>>({});

  useFrame(({ camera, size }, dt) => {
    const els = labelsRef.current;
    if (!els) return;
    const compact = size.width < COMPACT_WIDTH;
    const sizeFactor = Math.min(1.1, Math.max(0.62, Math.min(size.height / 600, size.width / 760)));
    const now = performance.now();
    const items: Item[] = [];

    for (const a of LABEL_ANCHORS) {
      const el = els[a.id];
      if (!el) continue;

      const mode = compact ? "true" : "false";
      if (el.dataset.compact !== mode) {
        el.dataset.compact = mode;
        delete boxes.current[a.id]; // layout changed — re-measure
      }

      // The EMS-core chip is decorative; drop it on small canvases to reduce clutter.
      if (compact && a.id === "hub") {
        el.style.opacity = "0";
        continue;
      }

      v.set(a.top[0], a.top[1], a.top[2]);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const behind = v.z > 1;

      v.set(a.base[0], a.base[1], a.base[2]);
      v.project(camera);
      const baseX = (v.x * 0.5 + 0.5) * size.width;
      const baseY = (-v.y * 0.5 + 0.5) * size.height;

      const s = Math.min(1.15, Math.max(0.62, (26 / dist) * sizeFactor));
      items.push({ id: a.id, el, x, y, baseX, baseY, s, dist, behind });
    }

    // Nearest chips keep their spot; farther ones step out of the way.
    items.sort((p, q) => p.dist - q.dist);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const k = 1 - Math.exp(-dt * 8);

    for (const it of items) {
      // Re-measure sparingly: chip content changes rarely and layout reads are costly.
      let box = boxes.current[it.id];
      if (!box || now - box.at > 1000) {
        box = { w: it.el.offsetWidth || 190, h: it.el.offsetHeight || 70, at: now };
        boxes.current[it.id] = box;
      }
      const w = box.w * it.s;
      const h = box.h * it.s;

      let y = it.y;
      for (let i = 0; i < 4; i++) {
        const hit = placed.find(
          (r) => Math.abs(r.x - it.x) < (r.w + w) / 2 - 6 && y - h < r.y + 4 && y > r.y - r.h - 4,
        );
        if (!hit) break;
        y = hit.y - hit.h - 8;
      }

      const prev = offsets.current[it.id] ?? 0;
      const offset = prev + (y - it.y - prev) * k;
      offsets.current[it.id] = offset;
      const rawY = it.y + offset;

      // Keep chips inside the canvas (and clear of the control buttons in the top-right corner).
      const rightMargin = rawY - h < 240 ? 72 : 10;
      const minX = w / 2 + 10;
      const maxX = Math.max(minX, size.width - w / 2 - rightMargin);
      const finalX = Math.min(maxX, Math.max(minX, it.x));

      // ...and clear of the title block in the top-left corner, easing in so chips never jump.
      let finalY = rawY;
      if (size.width >= TITLE_MIN_CANVAS) {
        const near = Math.min(1, Math.max(0, (TITLE_WIDTH + TITLE_EASE - (finalX - w / 2)) / TITLE_EASE));
        finalY += near * Math.max(0, TITLE_HEIGHT + h - rawY);
      }
      placed.push({ x: finalX, y: finalY, w, h });

      const el = it.el;
      el.style.transform = `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, 0) translate(-50%, -100%) scale(${it.s.toFixed(3)})`;
      el.style.zIndex = String(Math.round(2000 - it.dist * 20));
      el.style.opacity = it.behind ? "0" : "1";

      // Leader line: from the chip's bottom-centre to the asset, angled when the chip was nudged sideways.
      const leader = el.lastElementChild as HTMLElement | null;
      if (leader) {
        const dx = it.baseX - finalX;
        const dy = Math.max(0, it.baseY - finalY);
        const length = Math.hypot(dx, dy) / it.s;
        const angle = -Math.atan2(dx, Math.max(dy, 1)) * (180 / Math.PI);
        leader.style.height = `${length.toFixed(1)}px`;
        leader.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      }
    }
  });

  return null;
}
