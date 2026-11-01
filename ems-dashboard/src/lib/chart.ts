/**
 * Where the y = 0 line sits inside a signed area's bounding box, as a 0 → 1 gradient offset
 * (0 = top, 1 = bottom). Used to colour the positive and negative halves of an area differently.
 */
export function zeroOffset(values: ReadonlyArray<number | null | undefined>) {
  let max = 0;
  let min = 0;
  for (const v of values) {
    if (typeof v !== "number") continue;
    if (v > max) max = v;
    if (v < min) min = v;
  }
  if (max === min) return 1;
  return max / (max - min);
}
