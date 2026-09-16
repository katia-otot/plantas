"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { shouldHideHeaderOnScroll } from "@/lib/hide-on-scroll";

export function HideOnScrollHeader({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    lastYRef.current = Math.max(0, window.scrollY);

    function onScroll() {
      const y = Math.max(0, window.scrollY);
      const next = shouldHideHeaderOnScroll({
        y,
        lastY: lastYRef.current,
        hidden: hiddenRef.current,
      });
      lastYRef.current = y;
      if (next === hiddenRef.current) {
        return;
      }
      hiddenRef.current = next;
      setHidden(next);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-30 border-b border-emerald-900/10 bg-[#edf7f0] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        {children}
      </header>
      <div className="h-14 shrink-0" aria-hidden="true" />
    </>
  );
}
