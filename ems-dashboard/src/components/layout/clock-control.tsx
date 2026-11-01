"use client";

import { Pause, Play } from "lucide-react";
import { useLive, type SpeedMode } from "@/providers/live-provider";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LiveDot } from "@/components/ui/live-dot";
import { Segmented } from "@/components/ui/segmented";

const OPTIONS: readonly { value: SpeedMode; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "x60", label: "×60" },
  { value: "x300", label: "×300" },
];

export function ClockControl({ className }: { className?: string }) {
  const { minute, speed, setSpeed, paused, togglePause, scrubTo } = useLive();
  const isLive = speed === "live";
  const progress = (minute / 1440) * 100;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border border-line bg-white/85 py-1.5 pl-4 pr-1.5 shadow-soft backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        {paused ? (
          <span className="size-2 rounded-full bg-ink-300" />
        ) : (
          <LiveDot />
        )}
        <span className="font-display num w-[4.6rem] text-[15px] font-bold text-ink-900" suppressHydrationWarning>
          {formatClock(minute, isLive)}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={1439}
        step={1}
        value={Math.floor(minute)}
        disabled={isLive}
        onChange={(e) => scrubTo(Number(e.target.value))}
        aria-label="Simulated time of day"
        className="scrubber hidden w-28 xl:block"
        style={{ ["--progress" as string]: `${progress}%` }}
      />

      <button
        type="button"
        onClick={togglePause}
        disabled={isLive}
        aria-label={paused ? "Resume simulation" : "Pause simulation"}
        className="grid size-8 place-items-center rounded-full bg-ink-50 text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {paused ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
      </button>

      <Segmented value={speed} onChange={setSpeed} options={OPTIONS} size="sm" ariaLabel="Simulation speed" />
    </div>
  );
}
