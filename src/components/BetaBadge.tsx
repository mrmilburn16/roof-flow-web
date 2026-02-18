"use client";

import { useState, useRef, useEffect } from "react";

export function BetaBadge() {
  const [showTooltip, setShowTooltip] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const show = () => setShowTooltip(true);
    const hide = () => setShowTooltip(false);
    el.addEventListener("mouseenter", show);
    el.addEventListener("mouseleave", hide);
    return () => {
      el.removeEventListener("mouseenter", show);
      el.removeEventListener("mouseleave", hide);
    };
  }, []);

  return (
    <span
      ref={wrapperRef}
      className="relative shrink-0 rounded-[var(--radius)] bg-[var(--badge-info-bg)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--badge-info-text)]"
    >
      Beta
      {showTooltip && (
        <span
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-card)]"
          role="tooltip"
        >
          Still being developed — we're improving it.
        </span>
      )}
    </span>
  );
}
