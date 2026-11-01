"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DAY_MINUTES,
  DEFAULT_START_MINUTE,
  getSnapshot,
  type Snapshot,
} from "@/lib/simulation";

export type SpeedMode = "live" | "x60" | "x300";

const SPEED: Record<SpeedMode, number> = { live: 1, x60: 60, x300: 300 };

interface LiveContextValue {
  /** Simulated minute of the day (fractional). */
  minute: number;
  /** Seconds elapsed since mount — drives the telemetry noise. */
  noiseSeconds: number;
  snapshot: Snapshot;
  speed: SpeedMode;
  setSpeed: (mode: SpeedMode) => void;
  paused: boolean;
  togglePause: () => void;
  scrubTo: (minute: number) => void;
  /** Local calendar date (YYYY-MM-DD). Stable between server and first client render. */
  dateISO: string;
}

const LiveContext = createContext<LiveContextValue | null>(null);

const FALLBACK_DATE = "2026-10-31";
const noopSubscribe = () => () => {};
const pad = (n: number) => String(n).padStart(2, "0");

function clientDate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function realMinute() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState({
    minute: DEFAULT_START_MINUTE,
    t: 0,
  });
  const [speed, setSpeedState] = useState<SpeedMode>("x60");
  const [paused, setPaused] = useState(false);

  const dateISO = useSyncExternalStore(noopSubscribe, clientDate, () => FALLBACK_DATE);

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      setClock((prev) => {
        let minute = prev.minute;
        if (speed === "live") minute = realMinute();
        else if (!paused) minute = (prev.minute + (dt * SPEED[speed]) / 60) % DAY_MINUTES;
        return { minute, t: prev.t + dt };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [speed, paused]);

  const setSpeed = useCallback((mode: SpeedMode) => {
    setSpeedState(mode);
    if (mode === "live") {
      setPaused(false);
      setClock((prev) => ({ ...prev, minute: realMinute() }));
    }
  }, []);

  const togglePause = useCallback(() => setPaused((p) => !p), []);

  const scrubTo = useCallback((minute: number) => {
    setClock((prev) => ({ ...prev, minute: ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES }));
  }, []);

  const snapshot = useMemo(() => getSnapshot(clock.minute, clock.t), [clock]);

  const value = useMemo<LiveContextValue>(
    () => ({
      minute: clock.minute,
      noiseSeconds: clock.t,
      snapshot,
      speed,
      setSpeed,
      paused,
      togglePause,
      scrubTo,
      dateISO,
    }),
    [clock, snapshot, speed, setSpeed, paused, togglePause, scrubTo, dateISO],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used inside <LiveProvider>");
  return ctx;
}
