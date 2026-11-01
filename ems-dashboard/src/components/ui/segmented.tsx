"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-ink-100/80 p-1 ring-1 ring-inset ring-ink-200/60",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-semibold transition-all duration-300",
              size === "sm" ? "px-3 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]",
              active
                ? "bg-white text-brand-700 shadow-soft"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
