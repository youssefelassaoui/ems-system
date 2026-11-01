import { Cloud, CloudMoon, CloudRain, CloudSun, Cloudy, Moon, Sun, type LucideProps } from "lucide-react";
import type { Condition } from "@/lib/weather";

const DAY = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  overcast: Cloudy,
  rain: CloudRain,
} as const;

const NIGHT = {
  ...DAY,
  clear: Moon,
  partly: CloudMoon,
} as const;

/** Natural colour of each condition: sun amber, clouds slate, rain blue, night indigo. */
const TINT: Record<Condition, string> = {
  clear: "text-amber-500",
  partly: "text-amber-500",
  cloudy: "text-slate-400",
  overcast: "text-slate-500",
  rain: "text-sky-500",
};

export function WeatherIcon({
  condition,
  isDay = true,
  tinted = false,
  className,
  ...props
}: { condition: Condition; isDay?: boolean; tinted?: boolean } & LucideProps) {
  const Icon = (isDay ? DAY : NIGHT)[condition];
  const tint = tinted ? (isDay ? TINT[condition] : "text-indigo-400") : "";
  return <Icon strokeWidth={1.6} className={[tint, className].filter(Boolean).join(" ")} {...props} />;
}
