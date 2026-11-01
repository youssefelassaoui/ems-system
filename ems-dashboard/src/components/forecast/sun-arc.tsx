import { useId } from "react";
import { formatClock } from "@/lib/format";
import { SUN_TIMES } from "@/lib/weather";

/** Sun path from sunrise to sunset with the current position marked. */
export function SunArc({ minute, className }: { minute: number; className?: string }) {
  const id = useId();
  const { sunrise, sunset } = SUN_TIMES;
  const raw = (minute - sunrise) / (sunset - sunrise);
  const t = Math.min(1, Math.max(0, raw));
  const isDay = raw >= 0 && raw <= 1;

  const w = 320;
  const h = 164;
  const cx = w / 2;
  const cy = 146;
  const r = 124;
  const angle = Math.PI * (1 - t);
  const sx = cx + r * Math.cos(angle);
  const sy = cy - r * Math.sin(angle);

  const start = `${cx - r} ${cy}`;
  const end = `${cx + r} ${cy}`;
  const arc = `M ${start} A ${r} ${r} 0 0 1 ${end}`;
  const progress = `M ${start} A ${r} ${r} 0 0 1 ${sx.toFixed(2)} ${sy.toFixed(2)}`;

  const daylight = sunset - sunrise;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-p`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffe08a" stopOpacity="1" />
          </linearGradient>
          <radialGradient id={`${id}-g`}>
            <stop offset="0%" stopColor="#ffd23f" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffb020" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1={cx - r - 14} x2={cx + r + 14} y1={cy} y2={cy} stroke="#ffffff" strokeOpacity="0.25" />
        <path d={arc} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" strokeDasharray="0.1 9" strokeLinecap="round" />
        {raw > 0 && (
          <path d={progress} fill="none" stroke={`url(#${id}-p)`} strokeWidth="5" strokeLinecap="round" />
        )}
        <circle cx={sx} cy={sy} r={isDay ? 26 : 0} fill={`url(#${id}-g)`} opacity="0.8" />
        <circle cx={sx} cy={sy} r="9" fill={isDay ? "#ffd23f" : "#ffffff"} opacity={isDay ? 1 : 0.55} />
        <circle cx={sx} cy={sy} r="9" fill="none" stroke={isDay ? "#ffd23f" : "#ffffff"} strokeOpacity="0.5" strokeWidth="5" />
      </svg>
      <div className="-mt-1 flex justify-between text-[11.5px] font-medium text-white/80">
        <span>
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/55">Sunrise</span>
          {formatClock(sunrise)}
        </span>
        <span className="text-center">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/55">Daylight</span>
          {Math.floor(daylight / 60)} h {String(Math.round(daylight % 60)).padStart(2, "0")} min
        </span>
        <span className="text-right">
          <span className="block text-[10px] uppercase tracking-[0.12em] text-white/55">Sunset</span>
          {formatClock(sunset)}
        </span>
      </div>
    </div>
  );
}
