import type { ReactNode } from "react";

interface PayloadItem {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  stroke?: string;
  fill?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<PayloadItem>;
  label?: string | number;
  labelFormatter?: (label: string | number) => ReactNode;
  valueFormatter?: (value: number, item: PayloadItem) => string;
  /** Hide series whose dataKey matches. */
  hiddenKeys?: readonly string[];
  footer?: ReactNode;
  /** When set, appends a total row summing the series listed in `totalKeys`. */
  totalLabel?: string;
  totalKeys?: readonly string[];
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hiddenKeys = [],
  footer,
  totalLabel,
  totalKeys,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(
    (p) =>
      p.value !== null &&
      p.value !== undefined &&
      !hiddenKeys.includes(String(p.dataKey)),
  );
  if (!rows.length) return null;

  const totalRows =
    totalLabel && totalKeys
      ? rows.filter((p) => totalKeys.includes(String(p.dataKey)) && typeof p.value === "number")
      : [];
  const total = totalRows.length ? totalRows.reduce((s, p) => s + (p.value as number), 0) : null;

  return (
    <div className="min-w-44 rounded-2xl border border-line bg-white/95 p-3 shadow-[0_18px_40px_-14px_rgba(21,65,192,0.35)] backdrop-blur-xl">
      {label !== undefined && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.map((p, i) => (
          <li key={`${p.dataKey}-${i}`} className="flex items-center justify-between gap-5 text-[12.5px]">
            <span className="flex items-center gap-2 text-ink-600">
              <span
                className="size-2 rounded-full"
                style={{ background: p.color ?? p.stroke ?? p.fill }}
              />
              {p.name}
            </span>
            <span className="num font-semibold text-ink-900">
              {typeof p.value === "number" && valueFormatter
                ? valueFormatter(p.value, p)
                : p.value}
            </span>
          </li>
        ))}
      </ul>
      {total !== null && (
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[12.5px]">
          <span className="font-semibold text-ink-600">{totalLabel}</span>
          <span className="num font-bold text-brand-700">
            {valueFormatter ? valueFormatter(total, {}) : total.toFixed(0)}
          </span>
        </div>
      )}
      {footer && <div className="mt-2 border-t border-line pt-2 text-[11.5px] text-ink-500">{footer}</div>}
    </div>
  );
}
