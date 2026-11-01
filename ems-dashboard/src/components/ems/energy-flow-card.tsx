"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Move3d, MousePointerClick, Plus, Rotate3d, RotateCcw } from "lucide-react";
import { useLive } from "@/providers/live-provider";
import { smoothstep, type EnergyFlows } from "@/lib/simulation";
import { ASSET_INFO, type AssetId } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";
import { Card } from "@/components/ui/card";
import { LiveDot } from "@/components/ui/live-dot";
import { AssetCard } from "./asset-card";
import { LabelChips } from "./label-chips";
import type { LabelRefs } from "./scene/labels";
import { COLORS, type SceneApi, type SceneInput } from "./scene/types";

function SceneLoader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-14">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-300/50" />
          <span className="absolute inset-2 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow" />
        </div>
        <p className="text-[12.5px] font-semibold text-ink-500">Building digital twin…</p>
      </div>
    </div>
  );
}

const EnergyScene = dynamic(() => import("./scene/energy-scene"), {
  ssr: false,
  loading: () => <SceneLoader />,
});

export function describeMode(f: EnergyFlows) {
  const night = f.pv < 5;
  if (night && f.batteryMode === "discharging") return "Battery is supplying the campus";
  if (night && f.batteryMode === "charging") return "Off-peak · topping up storage from the grid";
  if (night && f.gridMode === "importing") return "Night · campus supplied by the grid";
  if (f.gridMode === "exporting" && f.batteryMode === "charging")
    return "Solar surplus · storing & exporting";
  if (f.gridMode === "exporting") return "Solar surplus · exporting to the grid";
  if (f.batteryMode === "charging") return "Solar surplus · charging the battery";
  if (f.batteryMode === "discharging") return "Battery is backing up solar";
  if (f.gridMode === "importing") return "Grid is topping up the campus";
  return "Solar covers the campus demand";
}

const LEGEND = [
  { label: "Solar PV", color: COLORS.pv },
  { label: "Battery", color: COLORS.battery },
  { label: "Grid", color: COLORS.grid },
  { label: "Campus", color: COLORS.load },
] as const;

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center rounded-2xl border bg-white/90 text-ink-600 shadow-soft backdrop-blur-xl transition hover:-translate-y-px hover:text-brand-700",
        active ? "border-brand-200 text-brand-700 ring-2 ring-brand-100" : "border-line",
      )}
    >
      {children}
    </button>
  );
}

export function EnergyFlowCard({ className }: { className?: string }) {
  const { snapshot } = useLive();
  const router = useRouter();
  const [autoRotate, setAutoRotate] = useState(true);
  const [active, setActive] = useState(true);
  const holder = useRef<HTMLDivElement>(null);
  const api = useRef<SceneApi | null>(null);
  const labelsRef: LabelRefs = useRef({});

  /* ---- Asset interaction ------------------------------------------------ */
  const [hovered, setHovered] = useState<AssetId | null>(null);
  /** Touch devices have no hover: the first tap pins the fact sheet, the second one navigates. */
  const [pinned, setPinned] = useState<AssetId | null>(null);
  const [touch, setTouch] = useState(false);
  const touchRef = useRef(false);
  const follower = useRef<HTMLDivElement>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  const highlight = hovered ?? pinned;

  const place = useCallback((clientX: number, clientY: number) => {
    lastPointer.current = { x: clientX, y: clientY };
    const box = holder.current;
    const el = follower.current;
    if (!box || !el) return;
    const rect = box.getBoundingClientRect();
    const card = el.firstElementChild as HTMLElement | null;
    const w = card?.offsetWidth ?? 288;
    const h = card?.offsetHeight ?? 280;
    const gap = 22;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let x = px + gap;
    if (x + w > rect.width - 12) x = px - w - gap;
    x = Math.max(12, x);
    const y = Math.min(Math.max(12, py - 24), Math.max(12, rect.height - h - 12));
    el.style.transform = `translate3d(${x.toFixed(0)}px, ${y.toFixed(0)}px, 0)`;
  }, []);

  useEffect(() => {
    if (hovered) place(lastPointer.current.x, lastPointer.current.y);
  }, [hovered, place]);

  const trackPointer = useCallback(
    (e: React.PointerEvent) => {
      const isTouch = e.pointerType !== "mouse" && e.pointerType !== "pen";
      if (touchRef.current !== isTouch) {
        touchRef.current = isTouch;
        setTouch(isTouch);
        if (!isTouch) setPinned(null);
      }
      if (!isTouch) place(e.clientX, e.clientY);
    },
    [place],
  );

  const onHover = useCallback(
    (id: AssetId | null, anchor?: HTMLElement) => {
      setHovered(id);
      if (id && anchor) {
        const r = anchor.getBoundingClientRect();
        place(r.right + 8, r.top);
      }
    },
    [place],
  );

  const onSelect = useCallback(
    (id: AssetId) => {
      // `touchRef` is fed by pointerdown, which is more reliable than the click event's own pointerType.
      if (!touchRef.current || pinned === id) {
        router.push(ASSET_INFO[id].href);
      } else {
        setPinned(id);
      }
    },
    [pinned, router],
  );

  const onMiss = useCallback(() => setPinned(null), []);

  /* ---- Visibility: pause rendering when the hero is off-screen ---------- */
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      threshold: 0.02,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const input = useMemo<SceneInput>(
    () => ({
      flows: snapshot.flows,
      daylight: snapshot.daylight,
      minute: snapshot.minute,
      selfSufficiency: snapshot.today.selfSufficiency,
    }),
    [snapshot],
  );

  const day = smoothstep(0, 0.15, snapshot.daylight);

  return (
    <Card padded={false} fill className={className}>
      {/* Phone header — the overlay title below would collide with the chips on narrow canvases. */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-line/70 bg-white/80 px-5 py-4 sm:hidden">
        <div>
          <h2 className="font-display text-[19px] font-bold leading-tight text-ink-900">Live energy flow</h2>
          <p className="text-[12px] text-ink-400">3D digital twin · tap an asset for details</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-brand-700 shadow-soft">
          <LiveDot />
          Live
        </span>
      </div>

      <div
        ref={holder}
        onPointerDownCapture={trackPointer}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHovered(null)}
        className={cn(
          "relative isolate h-[520px] overflow-hidden sm:h-[640px] lg:h-auto lg:min-h-0 lg:flex-1",
          highlight && !touch && "cursor-pointer",
        )}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_50%_30%,#ffffff_0%,#eef4ff_55%,#dce8ff_100%)]" />
        <div
          className="absolute inset-0 -z-10 bg-brand-900 transition-opacity duration-[1500ms]"
          style={{ opacity: (1 - day) * 0.2 }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-white/70 to-transparent" />

        <EnergyScene
          input={input}
          autoRotate={autoRotate && !highlight}
          active={active}
          apiRef={api}
          labelsRef={labelsRef}
          highlight={highlight}
          onHover={setHovered}
          onSelect={onSelect}
          onMiss={onMiss}
        />
        <LabelChips
          flows={snapshot.flows}
          selfSufficiency={snapshot.today.selfSufficiency}
          labelsRef={labelsRef}
          highlight={highlight}
          onHover={onHover}
        />

        {/* Title */}
        <div className="pointer-events-none absolute left-5 top-5 z-10 hidden sm:left-7 sm:top-6 sm:block">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/90 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-brand-700 shadow-soft backdrop-blur-xl">
              <LiveDot />
              Real-time
            </span>
          </div>
          <h2 className="font-display mt-3 text-[22px] font-bold leading-tight text-ink-900 sm:text-[26px]">
            Live energy flow
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-500">3D digital twin · {SITE.name}</p>
        </div>

        {/* Controls */}
        <div className="absolute right-4 top-5 z-10 flex flex-col gap-2 sm:right-6 sm:top-6">
          <IconButton label="Zoom in" onClick={() => api.current?.zoomBy(0.82)}>
            <Plus className="size-[18px]" />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => api.current?.zoomBy(1.2)}>
            <Minus className="size-[18px]" />
          </IconButton>
          <IconButton label="Reset view" onClick={() => api.current?.reset()}>
            <RotateCcw className="size-[17px]" />
          </IconButton>
          <IconButton
            label={autoRotate ? "Stop auto-rotation" : "Start auto-rotation"}
            active={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
          >
            <Rotate3d className="size-[18px]" />
          </IconButton>
        </div>

        {/* Fact sheet that follows the pointer (mouse / pen) */}
        <div
          ref={follower}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-20 will-change-transform"
        >
          {hovered && !touch && <AssetCard key={hovered} id={hovered} />}
        </div>

        {/* Touch: docked fact sheet with an explicit link */}
        {touch && pinned && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[72px] z-20 flex justify-center px-4">
            <AssetCard key={pinned} id={pinned} interactive compact className="pointer-events-auto" />
          </div>
        )}

        {/* Bottom bar */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-end justify-between gap-3 sm:inset-x-6 sm:bottom-5">
          <div className="pointer-events-auto hidden flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-line bg-white/90 px-4 py-2.5 shadow-soft backdrop-blur-xl sm:flex">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-2 text-[12px] font-semibold text-ink-600">
                <span className="h-1.5 w-5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
            <span className="hidden items-center gap-1.5 border-l border-line pl-4 text-[12px] font-medium text-ink-400 lg:flex">
              <MousePointerClick className="size-3.5" />
              Hover or click PV, battery and grid
            </span>
          </div>

          <div className="flex w-full items-center gap-2.5 rounded-2xl border border-brand-100 bg-white/90 px-4 py-2.5 shadow-soft backdrop-blur-xl sm:w-auto">
            <Move3d className="size-4 text-brand-600" />
            <span className="text-[12.5px] font-semibold text-ink-800">
              {describeMode(snapshot.flows)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
