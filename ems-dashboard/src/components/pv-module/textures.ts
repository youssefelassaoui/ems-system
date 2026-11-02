import * as THREE from "three";
import { CELL_LAYOUT, CELL_TONE, FALLBACK_LAYOUT, type CellLayout } from "@/lib/module-layout";
import { rng } from "@/lib/random";

export { CELL_LAYOUT, CELL_TONE, FALLBACK_LAYOUT, rng, type CellLayout };

function roundedCell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, chamfer: number) {
  ctx.beginPath();
  ctx.moveTo(x + chamfer, y);
  ctx.lineTo(x + w - chamfer, y);
  ctx.lineTo(x + w, y + chamfer);
  ctx.lineTo(x + w, y + h - chamfer);
  ctx.lineTo(x + w - chamfer, y + h);
  ctx.lineTo(x + chamfer, y + h);
  ctx.lineTo(x, y + h - chamfer);
  ctx.lineTo(x, y + chamfer);
  ctx.closePath();
}

/** Front face of a module: cells, busbars and backsheet, drawn for the given technology. */
export function createCellTexture(layout: CellLayout) {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(layout.cols * 31 + layout.busbars * 7 + layout.style.length);

  ctx.fillStyle = layout.backsheet;
  ctx.fillRect(0, 0, W, H);

  if (layout.style === "thinfilm") {
    // One continuous absorber with laser-scribed cell stripes.
    const m = 34;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#232826");
    g.addColorStop(0.5, "#1b1f1e");
    g.addColorStop(1, "#262a27");
    ctx.fillStyle = g;
    ctx.fillRect(m, m, W - 2 * m, H - 2 * m);
    ctx.strokeStyle = "rgba(160,175,170,0.11)";
    ctx.lineWidth = 1.4;
    for (let x = m + 9; x < W - m; x += 9.6) {
      ctx.beginPath();
      ctx.moveTo(x, m);
      ctx.lineTo(x, H - m);
      ctx.stroke();
    }
    // Edge bus ribbons
    ctx.fillStyle = "rgba(150,160,168,0.35)";
    ctx.fillRect(m, m + 6, W - 2 * m, 5);
    ctx.fillRect(m, H - m - 11, W - 2 * m, 5);
  } else {
    const margin = 30;
    const gap = 6;
    const centreGap = layout.half ? 26 : 0;
    const usableW = W - 2 * margin - centreGap - gap * (layout.cols - 1);
    const cw = usableW / layout.cols;
    const ch = (H - 2 * margin - gap * (layout.rows - 1)) / layout.rows;

    for (let c = 0; c < layout.cols; c++) {
      const extra = layout.half && c >= layout.cols / 2 ? centreGap : 0;
      const x = margin + c * (cw + gap) + extra;
      for (let r = 0; r < layout.rows; r++) {
        const y = margin + r * (ch + gap);
        const chamfer = layout.style === "mono" && !layout.half ? Math.min(cw, ch) * 0.12 : 2;

        if (layout.style === "poly") {
          ctx.save();
          roundedCell(ctx, x, y, cw, ch, 1);
          ctx.clip();
          ctx.fillStyle = "#2b569e";
          ctx.fillRect(x, y, cw, ch);
          // Multicrystalline flakes
          for (let k = 0; k < 70; k++) {
            const px = x + rand() * cw;
            const py = y + rand() * ch;
            const size = 8 + rand() * 30;
            ctx.beginPath();
            ctx.moveTo(px, py);
            for (let v = 0; v < 5; v++) {
              const a = (v / 5) * Math.PI * 2 + rand() * 0.8;
              ctx.lineTo(px + Math.cos(a) * size * (0.4 + rand()), py + Math.sin(a) * size * (0.4 + rand()));
            }
            ctx.closePath();
            const l = 26 + rand() * 24;
            ctx.fillStyle = `hsla(${212 + rand() * 12}, 62%, ${l}%, 0.55)`;
            ctx.fill();
          }
          ctx.restore();
        } else {
          const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
          if (layout.style === "hjt") {
            g.addColorStop(0, "#0b1324");
            g.addColorStop(1, "#111c33");
          } else {
            g.addColorStop(0, "#102244");
            g.addColorStop(0.6, "#16305c");
            g.addColorStop(1, "#0f2142");
          }
          roundedCell(ctx, x, y, cw, ch, chamfer);
          ctx.fillStyle = g;
          ctx.fill();
          // Fine fingers
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = "rgba(170,190,220,0.10)";
          ctx.lineWidth = 1;
          for (let fx = x + 4; fx < x + cw; fx += 5) {
            ctx.beginPath();
            ctx.moveTo(fx, y);
            ctx.lineTo(fx, y + ch);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Busbars / wires
        ctx.strokeStyle = layout.style === "hjt" ? "rgba(205,214,226,0.55)" : "rgba(214,222,232,0.8)";
        ctx.lineWidth = layout.busbars > 10 ? 1.3 : 2.4;
        for (let b = 1; b <= layout.busbars; b++) {
          const by = y + (b / (layout.busbars + 1)) * ch;
          ctx.beginPath();
          ctx.moveTo(x - (c > 0 ? gap : 0), by);
          ctx.lineTo(x + cw, by);
          ctx.stroke();
        }
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export interface DustOptions {
  /** 0 → 1, from `dustCoverage(loss)`. */
  coverage: number;
  seed: number;
  /** Bird droppings on this module. */
  hotspot: boolean;
}

/**
 * Transparent dust layer. Everything scales with `coverage`, so a lightly soiled module only
 * shows a faint haze and a few grains, while a heavily soiled one is clearly brown, with a dense
 * band along the lower frame where dust and dried rain residue collect on a tilted module.
 */
export function createDustTexture({ coverage, seed, hotspot }: DustOptions) {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(seed * 9973 + 17);
  const c = Math.max(0, Math.min(1, coverage));

  if (c > 0) {
    // Even haze
    ctx.fillStyle = `rgba(184,150,106,${0.06 + 0.4 * c})`;
    ctx.fillRect(0, 0, W, H);

    // Patchy blotches
    const blotches = Math.round(18 + 60 * c);
    for (let i = 0; i < blotches; i++) {
      const x = rand() * W;
      const y = rand() * H;
      const r = 40 + rand() * 170;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = (0.05 + 0.22 * rand()) * c;
      g.addColorStop(0, `rgba(170,134,90,${a})`);
      g.addColorStop(1, "rgba(170,134,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Lower-edge accumulation (bottom of the canvas = lower edge of the tilted module)
    const band = H * (0.08 + 0.14 * c);
    const edge = ctx.createLinearGradient(0, H, 0, H - band);
    edge.addColorStop(0, `rgba(150,112,70,${0.25 + 0.6 * c})`);
    edge.addColorStop(1, "rgba(150,112,70,0)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, H - band, W, band);
    for (const cx of [0, W]) {
      const g = ctx.createRadialGradient(cx, H, 0, cx, H, 180);
      g.addColorStop(0, `rgba(140,104,64,${0.2 + 0.45 * c})`);
      g.addColorStop(1, "rgba(140,104,64,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - 180, H - 180, 360, 180);
    }

    // Dried rain streaks running down from the dusty film
    const streaks = Math.round(6 + 30 * c);
    for (let i = 0; i < streaks; i++) {
      const x = rand() * W;
      const len = 30 + rand() * 120;
      const y = H - len - rand() * 30;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, "rgba(160,124,80,0)");
      g.addColorStop(1, `rgba(150,114,72,${(0.12 + 0.3 * rand()) * c})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5 + rand() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 6, y + len);
      ctx.stroke();
    }

    // Grains
    const grains = Math.round(500 + 9000 * c);
    for (let i = 0; i < grains; i++) {
      const x = rand() * W;
      // Grains get denser towards the lower edge.
      const y = H * (1 - Math.pow(rand(), 0.75));
      const r = 0.5 + rand() * 1.5;
      const light = rand() > 0.5;
      ctx.fillStyle = light
        ? `rgba(222,196,150,${(0.25 + 0.45 * rand()) * (0.4 + 0.6 * c)})`
        : `rgba(118,86,52,${(0.2 + 0.4 * rand()) * (0.4 + 0.6 * c)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (hotspot) {
    // Bird droppings: a few opaque white-grey splats.
    const spots = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < spots; i++) {
      const x = W * (0.2 + rand() * 0.6);
      const y = H * (0.15 + rand() * 0.55);
      const r = 5 + rand() * 8;
      for (let k = 0; k < 7; k++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * r * 0.9;
        ctx.fillStyle = k === 0 ? "rgba(236,234,226,0.96)" : `rgba(${214 + rand() * 30},${210 + rand() * 30},${196 + rand() * 30},0.9)`;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.35 + rand() * 0.5), r * (0.3 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(90,84,70,0.55)";
      ctx.beginPath();
      ctx.arc(x + (rand() - 0.5) * r * 0.5, y + (rand() - 0.5) * r * 0.5, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft round sprite for airborne dust motes. */
export function createMoteTexture() {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,240,215,1)");
  g.addColorStop(0.4, "rgba(230,200,150,0.6)");
  g.addColorStop(1, "rgba(230,200,150,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
