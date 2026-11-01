/** Thin horizontal progress bar (value in 0 → 1). */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-300 to-brand-600 transition-[width] duration-1000 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}
