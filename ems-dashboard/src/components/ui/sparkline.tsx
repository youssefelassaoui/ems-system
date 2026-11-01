import { useId } from "react";

interface SparklineProps {
  data: readonly number[];
  color?: string;
  height?: number;
  className?: string;
  /** Marks the last point with a dot. */
  marker?: boolean;
  markerFill?: string;
  min?: number;
  max?: number;
}

function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function Sparkline({
  data,
  color = "#2f6bff",
  height = 44,
  className,
  marker = true,
  markerFill = "#fff",
  min,
  max,
}: SparklineProps) {
  const id = useId();
  const w = 200;
  const h = 48;
  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const span = hi - lo || 1;
  const pad = 5;
  const pts: [number, number][] = data.map((v, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    pad + (1 - (v - lo) / span) * (h - pad * 2),
  ]);
  const line = smoothPath(pts);
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ height, width: "100%", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {marker && last && (
        <>
          {/* Zero-length round-capped paths stay perfectly circular under non-uniform scaling. */}
          <path
            d={`M ${last[0]} ${last[1]} L ${last[0]} ${last[1]}`}
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`M ${last[0]} ${last[1]} L ${last[0]} ${last[1]}`}
            stroke={markerFill}
            strokeWidth="5.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}
