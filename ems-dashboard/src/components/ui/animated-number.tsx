"use client";

import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  /** Optional thousands separator (en-US). */
  group?: boolean;
}

function fmt(v: number, decimals: number, group: boolean) {
  return group
    ? v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : v.toFixed(decimals);
}

/**
 * Tweens between values by writing straight to the DOM — no React re-render
 * per frame, so dozens of live numbers stay cheap.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  className,
  group = false,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = current.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      current.current = v;
      el.textContent = fmt(v, decimals, group);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals, duration, group]);

  return (
    <span ref={ref} className={className}>
      {fmt(value, decimals, group)}
    </span>
  );
}

type QuantityKind = "power" | "energy" | "mwh";

/** Power / energy figure with automatic unit scaling (kW↔MW, kWh↔MWh). */
export function AnimatedQuantity({
  value,
  kind,
  className,
  unitClassName = "ml-1 text-[0.55em] font-semibold opacity-60",
  signed = false,
}: {
  value: number;
  kind: QuantityKind;
  className?: string;
  unitClassName?: string;
  signed?: boolean;
}) {
  const abs = Math.abs(value);
  let scaled = value;
  let unit: string;
  let decimals: number;

  if (kind === "power") {
    if (abs >= 1000) {
      scaled = value / 1000;
      unit = "MW";
      decimals = 2;
    } else {
      unit = "kW";
      decimals = abs >= 100 ? 0 : 1;
    }
  } else if (kind === "energy") {
    if (abs >= 1000) {
      scaled = value / 1000;
      unit = "MWh";
      decimals = 2;
    } else {
      unit = "kWh";
      decimals = abs >= 100 ? 0 : 1;
    }
  } else {
    if (abs >= 1000) {
      scaled = value / 1000;
      unit = "GWh";
      decimals = 2;
    } else {
      unit = "MWh";
      decimals = abs >= 100 ? 0 : 1;
    }
  }

  return (
    <span className={className}>
      {signed && value > 0 ? "+" : ""}
      <AnimatedNumber key={unit} value={scaled} decimals={decimals} />
      <span className={unitClassName}>{unit}</span>
    </span>
  );
}
