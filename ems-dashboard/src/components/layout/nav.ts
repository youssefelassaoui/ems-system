import {
  BatteryCharging,
  CloudSun,
  LayoutDashboard,
  Drone,
  PlugZap,
  SprayCan,
  Sun,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Overview",
    title: "Energy overview",
    description: "Live flows between solar, storage, grid and the campus.",
    icon: LayoutDashboard,
  },
  {
    href: "/production",
    label: "Energy production",
    title: "Energy production",
    description: "Performance, KPIs and cumulative yield of every PV system.",
    icon: Sun,
  },
  {
    href: "/soiling",
    label: "Soiling",
    title: "Module soiling",
    description: "Dust on every PV system, string and module, and when to clean.",
    icon: SprayCan,
  },
  {
    href: "/inspection",
    label: "Drone inspection",
    title: "Drone inspection",
    description: "Thermal and RGB drone survey of every module, with the anomalies it found.",
    icon: Drone,
  },
  {
    href: "/battery",
    label: "Battery storage",
    title: "Battery storage",
    description: "State of charge, power exchange and unit health of the storage bank.",
    icon: BatteryCharging,
  },
  {
    href: "/grid",
    label: "Grid connection",
    title: "Grid connection",
    description: "Import, export and quality of the utility connection.",
    icon: PlugZap,
  },
  {
    href: "/forecast",
    label: "Weather & forecast",
    title: "Weather & PV forecast",
    description: "Meteorological outlook and expected photovoltaic output.",
    icon: CloudSun,
  },
] as const;
