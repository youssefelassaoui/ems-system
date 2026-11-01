import type { ReactNode } from "react";
import { useId } from "react";

interface RadialGaugeProps {
  /** 0 → 1 */
  value: number;
  size?: number;
  stroke?: number;
  from?: string;
  to?: string;
  track?: string;
  children?: ReactNode;
  /** Draw a 270° arc instead of a full ring. */
  arc?: boolean;
}

export function RadialGauge({
  value,
  size = 120,
  stroke = 10,
  from = "var(--color-brand-400)",
  to = "var(--color-brand-600)",
  track = "var(--color-brand-100)",
  children,
  arc = false,
}: RadialGaugeProps) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const sweep = arc ? 0.75 : 1;
  const v = Math.min(1, Math.max(0, value));
  const rotation = arc ? 135 : -90;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: from }} />
            <stop offset="100%" style={{ stopColor: to }} />
          </linearGradient>
        </defs>
        <g transform={`rotate(${rotation} ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            style={{ stroke: track }}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * sweep} ${c}`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * sweep * v} ${c}`}
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </g>
      </svg>
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
