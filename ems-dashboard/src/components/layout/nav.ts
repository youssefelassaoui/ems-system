import {
  BatteryCharging,
  CloudSun,
  LayoutDashboard,
  PlugZap,
  SprayCan,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { EnergyKey } from "@/lib/palette";

export interface NavItem {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Colour of the page — follows the energy source it is about. */
  accent: EnergyKey;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Overview",
    title: "Energy overview",
    description: "Live flows between solar, storage, grid and the campus.",
    icon: LayoutDashboard,
    accent: "load",
  },
  {
    href: "/production",
    label: "Energy production",
    title: "Energy production",
    description: "Performance, KPIs and cumulative yield of every PV system.",
    icon: Sun,
    accent: "solar",
  },
  {
    href: "/soiling",
    label: "Soiling",
    title: "Module soiling",
    description: "Dust on every PV system, string and module, and when to clean.",
    icon: SprayCan,
    accent: "dust",
  },
  {
    href: "/battery",
    label: "Battery storage",
    title: "Battery storage",
    description: "State of charge, power exchange and unit health of the storage bank.",
    icon: BatteryCharging,
    accent: "battery",
  },
  {
    href: "/grid",
    label: "Grid connection",
    title: "Grid connection",
    description: "Import, export and quality of the utility connection.",
    icon: PlugZap,
    accent: "grid",
  },
  {
    href: "/forecast",
    label: "Weather & forecast",
    title: "Weather & PV forecast",
    description: "Meteorological outlook and expected photovoltaic output.",
    icon: CloudSun,
    accent: "load",
  },
] as const;
