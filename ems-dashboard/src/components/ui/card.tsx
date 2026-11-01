import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "brand" | "soft";

interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: Tone;
  padded?: boolean;
  /** Turns the content wrapper into a column that stretches to the card's height. */
  fill?: boolean;
}

export function Card({
  tone = "default",
  padded = true,
  fill = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border",
        padded && "p-5 sm:p-6",
        tone === "default" && "border-line bg-white shadow-card",
        tone === "soft" && "border-line bg-white/70 shadow-soft backdrop-blur-xl",
        tone === "brand" &&
          "border-brand-700/40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white shadow-accent-glow",
        className,
      )}
      {...props}
    >
      {tone === "brand" && (
        <>
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-brand-300/25 blur-3xl" />
        </>
      )}
      <div className={cn("relative", fill && "flex h-full min-h-0 flex-col")}>{children}</div>
    </section>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  inverted?: boolean;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
  inverted,
}: CardHeaderProps) {
  return (
    <header className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              inverted
                ? "bg-white/15 text-white ring-1 ring-white/25"
                : "bg-brand-50 text-brand-600 ring-1 ring-brand-100",
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3
            className={cn(
              "font-display truncate text-[15px] font-semibold",
              inverted ? "text-white" : "text-ink-900",
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className={cn(
                "truncate text-[12.5px]",
                inverted ? "text-white/70" : "text-ink-400",
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400",
        className,
      )}
    >
      {children}
    </p>
  );
}
