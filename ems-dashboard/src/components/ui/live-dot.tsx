import { cn } from "@/lib/cn";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 text-brand-500", className)} aria-hidden>
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-current" />
      <span className="relative size-2 rounded-full bg-current" />
    </span>
  );
}
