import type { ReactNode } from "react";

interface Segment {
  value: number;
  color: string;
  label?: string;
}

export function Donut({
  segments,
  size = 180,
  stroke = 18,
  track = "#eef3fb",
  children,
}: {
  segments: readonly Segment[];
  size?: number;
  stroke?: number;
  track?: string;
  children?: ReactNode;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = stroke + 5;
  let acc = 0;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = Math.max(0, s.value) / total;
            const start = acc;
            acc += frac;
            const len = frac * c - gap;
            if (len <= 0) return null;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-(start * c + gap / 2)}
                style={{
                  transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1), stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            );
          })}
      </svg>
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
