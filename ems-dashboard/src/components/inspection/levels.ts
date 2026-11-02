import {
  Activity,
  Bird,
  Flame,
  Grid3x3,
  Hammer,
  TriangleAlert,
  Unplug,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AnomalyType, Severity } from "@/lib/inspection";

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#ca8a04",
  medium: "#ea580c",
  high: "#dc2626",
  critical: "#9f1239",
};

export const ANOMALY_ICON: Record<AnomalyType, LucideIcon> = {
  hotCell: Flame,
  multiCell: Grid3x3,
  diode: Zap,
  pid: Activity,
  junctionBox: TriangleAlert,
  shading: Bird,
  crack: Hammer,
  offline: Unplug,
};

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export const formatTemp = (c: number) => `${c.toFixed(1)} °C`;
export const formatDelta = (k: number) => `+${k.toFixed(1)} K`;
export const formatLoss = (loss: number) => `${(loss * 100).toFixed(loss < 0.1 ? 1 : 0)} %`;
