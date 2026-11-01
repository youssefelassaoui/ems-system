"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  // The sidebar is an icon rail by default. Opening it floats a full drawer above the page,
  // so the content (and the 3D canvas) never reflows.
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className="min-h-dvh">
      <div
        aria-hidden
        onClick={close}
        className={
          expanded
            ? "fixed inset-0 z-[35] hidden bg-ink-900/15 backdrop-blur-[3px] transition-opacity duration-300 lg:block"
            : "pointer-events-none fixed inset-0 z-[35] hidden bg-ink-900/0 opacity-0 transition-opacity duration-300 lg:block"
        }
      />
      <Sidebar expanded={expanded} onToggle={toggle} onNavigate={close} />
      <div className="lg:pl-[84px]">
        <Topbar />
        <main className="mx-auto max-w-[1560px] px-4 pb-16 pt-5 sm:px-8 sm:pt-6">{children}</main>
      </div>
    </div>
  );
}
