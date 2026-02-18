"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Shown inside the dropdown when options are empty */
  emptyMessage?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
};

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyMessage = "No options",
  id,
  "aria-label": ariaLabel,
  className = "",
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label ?? placeholder;

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inList = listRef.current?.contains(target);
      if (!inContainer && !inList) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent, type: "button" | "list") {
    if (type === "button") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (type === "list") {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const i = options.findIndex((o) => o.value === value);
      if (e.key === "ArrowDown" && i < options.length - 1) {
        e.preventDefault();
        onChange(options[i + 1].value);
      }
      if (e.key === "ArrowUp" && i > 0) {
        e.preventDefault();
        onChange(options[i - 1].value);
      }
      if (e.key === "Enter" && options[i]) {
        e.preventDefault();
        setOpen(false);
      }
    }
  }

  return (
    <div ref={containerRef} className={"relative " + (className || "")}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => handleKeyDown(e, "button")}
        className={
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-left text-[14px] text-[var(--input-text)] outline-none transition-[box-shadow,border-color] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--input-border)] disabled:opacity-50 disabled:cursor-not-allowed " +
          (open ? "ring-2 ring-[var(--ring)] border-[var(--input-border)]" : "")
        }
      >
        <span className={selected ? "text-[var(--input-text)]" : "text-[var(--input-placeholder)]"}>
          {displayLabel}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-[var(--text-muted)] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
          aria-hidden
        />
      </button>

      {open &&
        dropdownRect &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            onKeyDown={(e) => handleKeyDown(e, "list")}
            className="fixed z-[9999] min-h-[8rem] max-h-[320px] overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-card)]"
            style={{
              boxShadow: "var(--shadow-card), 0 0 0 1px var(--border)",
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {options.length === 0 ? (
              <li className="px-4 py-3 text-[14px] text-[var(--text-muted)]" role="option" aria-disabled>
                {emptyMessage}
              </li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(opt.value);
                        setOpen(false);
                      }
                    }}
                    className={
                      "flex cursor-pointer items-center justify-between gap-2 px-4 py-3 text-[14px] transition " +
                      (isSelected
                        ? "bg-[var(--nav-hover-bg)] text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]")
                    }
                  >
                    <span className="text-[var(--text-primary)]">{opt.label}</span>
                    {isSelected && <Check className="size-4 shrink-0 text-[var(--badge-info-text)]" aria-hidden />}
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
