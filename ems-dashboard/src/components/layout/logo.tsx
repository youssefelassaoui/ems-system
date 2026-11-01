import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-10", className)}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="logo-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5F94FF" />
          <stop offset="0.55" stopColor="#1952EB" />
          <stop offset="1" stopColor="#132F78" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="13" fill="url(#logo-bg)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="12.5" stroke="white" strokeOpacity="0.28" />
      <circle cx="20" cy="20" r="11.2" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="2.4 3.2" />
      <path
        d="M21.6 9.5 13.2 21.4h6.1l-1.1 9.1 8.6-12.4h-6.2l1-8.6Z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-[17px] font-bold tracking-tight text-ink-900">
            Chaire <span className="text-brand-600">EMS</span>
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
            Energy platform
          </p>
        </div>
      )}
    </div>
  );
}
