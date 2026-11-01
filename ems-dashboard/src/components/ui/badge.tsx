import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { PvStatus } from "@/lib/pv-systems";

type Tone = "brand" | "neutral" | "success" | "warning" | "muted" | "inverted";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200/70",
  neutral: "bg-ink-50 text-ink-600 ring-ink-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  muted: "bg-ink-100 text-ink-600 ring-ink-200",
  inverted: "bg-white/15 text-white ring-white/25",
};

export function Badge({
  tone = "brand",
  children,
  className,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS: Record<PvStatus, { tone: Tone; label: string }> = {
  online: { tone: "success", label: "Online" },
  warning: { tone: "warning", label: "Attention" },
  maintenance: { tone: "muted", label: "Maintenance" },
};

export function StatusBadge({ status }: { status: PvStatus }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
