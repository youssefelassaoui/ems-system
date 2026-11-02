/**
 * Cell layout of a module face, by technology. Shared by the 3D textures (RGB, dust, thermal) and by
 * the inspection model, so an anomaly on "cell 14" lands on the same cell in every view.
 * Coordinates are normalised to the module face in landscape: x along the long edge, y from the top.
 */
export interface CellLayout {
  style: "mono" | "poly" | "hjt" | "thinfilm";
  cols: number;
  rows: number;
  /** Half-cut cells: the module is split into two halves with a centre gap. */
  half: boolean;
  busbars: number;
  /** Colour seen between the cells (white backsheet, or the rear glass of glass–glass modules). */
  backsheet: string;
  /** Thin-film modules are usually frameless glass–glass laminates. */
  framed: boolean;
}

export const CELL_LAYOUT: Record<string, CellLayout> = {
  PERC: { style: "mono", cols: 22, rows: 6, half: true, busbars: 9, backsheet: "#e8ecf2", framed: true },
  "Poly-Si": { style: "poly", cols: 12, rows: 6, half: false, busbars: 4, backsheet: "#edf0f5", framed: true },
  TOPCon: { style: "mono", cols: 20, rows: 6, half: true, busbars: 16, backsheet: "#6e7d92", framed: true },
  CdTe: { style: "thinfilm", cols: 1, rows: 1, half: false, busbars: 0, backsheet: "#3b4249", framed: false },
  HJT: { style: "hjt", cols: 18, rows: 6, half: true, busbars: 12, backsheet: "#75849a", framed: true },
  "Bi-PERC": { style: "mono", cols: 24, rows: 6, half: true, busbars: 10, backsheet: "#71819a", framed: true },
};

export const FALLBACK_LAYOUT = CELL_LAYOUT.PERC;

/** Average cell colour — used for the module tiles of the structure maps. */
export const CELL_TONE: Record<CellLayout["style"], string> = {
  mono: "#14284d",
  poly: "#2a5397",
  hjt: "#0d1629",
  thinfilm: "#1f2422",
};

export const cellLayout = (technologyShort: string) => CELL_LAYOUT[technologyShort] ?? FALLBACK_LAYOUT;

/** Texture aspect: the module face is drawn on a 2:1 canvas. */
const MARGIN_X = 30 / 2048;
const MARGIN_Y = 30 / 1024;
const GAP_X = 6 / 2048;
const GAP_Y = 6 / 1024;
const CENTRE_GAP_X = 26 / 2048;
/** Inset of the absorber of a thin-film module. */
export const THIN_FILM_MARGIN = { x: 34 / 2048, y: 34 / 1024 };

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cellSize(layout: CellLayout) {
  const centre = layout.half ? CENTRE_GAP_X : 0;
  return {
    w: (1 - 2 * MARGIN_X - centre - GAP_X * (layout.cols - 1)) / layout.cols,
    h: (1 - 2 * MARGIN_Y - GAP_Y * (layout.rows - 1)) / layout.rows,
    centre,
  };
}

/** Normalised rectangle of one cell. */
export function cellRect(layout: CellLayout, c: number, r: number): Rect {
  if (layout.style === "thinfilm") {
    return { x: THIN_FILM_MARGIN.x, y: THIN_FILM_MARGIN.y, w: 1 - 2 * THIN_FILM_MARGIN.x, h: 1 - 2 * THIN_FILM_MARGIN.y };
  }
  const s = cellSize(layout);
  const extra = layout.half && c >= layout.cols / 2 ? s.centre : 0;
  return { x: MARGIN_X + c * (s.w + GAP_X) + extra, y: MARGIN_Y + r * (s.h + GAP_Y), w: s.w, h: s.h };
}

/** Cell under a normalised point, or null between cells. */
export function cellAt(layout: CellLayout, u: number, v: number): { c: number; r: number } | null {
  if (layout.style === "thinfilm") return null;
  const s = cellSize(layout);
  const r = Math.floor((v - MARGIN_Y) / (s.h + GAP_Y));
  if (r < 0 || r >= layout.rows) return null;
  let x = u - MARGIN_X;
  const halfW = (layout.cols / 2) * (s.w + GAP_X);
  if (layout.half && x >= halfW) x -= s.centre;
  const c = Math.floor(x / (s.w + GAP_X));
  if (c < 0 || c >= layout.cols) return null;
  const rect = cellRect(layout, c, r);
  if (u > rect.x + rect.w || v > rect.y + rect.h) return null;
  return { c, r };
}

/** Number of cells, or null for monolithic thin film. */
export function cellCount(layout: CellLayout) {
  return layout.style === "thinfilm" ? null : layout.cols * layout.rows;
}

/** Bypass-diode substrings: three bands of rows along the long edge. */
export const SUBSTRINGS = 3;

/** Junction boxes on the rear, as normalised points of the front face. Half-cut modules have three. */
export const junctionBoxes = (layout: CellLayout) =>
  (layout.half ? [0.36, 0.5, 0.64] : [0.5]).map((x) => ({ x, y: 0.14 }));
