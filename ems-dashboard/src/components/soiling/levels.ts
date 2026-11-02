import { dustCoverage, soilingLevel, type SoilingLevel } from "@/lib/soiling";
import { CELL_LAYOUT, CELL_TONE, FALLBACK_LAYOUT } from "./textures";

export const LEVEL_COLOR: Record<SoilingLevel, string> = {
  clean: "#10b981",
  light: "#d4a95a",
  moderate: "#c27a2c",
  heavy: "#b4441f",
};

export const levelColor = (loss: number) => LEVEL_COLOR[soilingLevel(loss)];

export const pct = (loss: number, decimals = 1) => `${(loss * 100).toFixed(decimals)} %`;

/** Background of a module tile: the cell colour of its technology under a dust film of matching density. */
export function moduleTileBackground(technology: string, loss: number) {
  const layout = CELL_LAYOUT[technology] ?? FALLBACK_LAYOUT;
  const c = dustCoverage(loss);
  return `linear-gradient(to top, rgba(150,112,70,${(0.2 + 0.7 * c).toFixed(3)}) 0%, rgba(184,150,106,${(0.06 + 0.6 * c).toFixed(3)}) 38%, rgba(190,158,114,${(0.03 + 0.5 * c).toFixed(3)}) 100%), ${CELL_TONE[layout.style]}`;
}
