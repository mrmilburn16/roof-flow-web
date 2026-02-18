const card =
  "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-card)]";

const cardHeader = "text-[13px] font-medium tracking-[-0.01em] text-[var(--text-secondary)]";

const cardValue = "mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]";

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--btn-primary-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--btn-primary-text)] transition hover:opacity-90 active:scale-[0.98]";

const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--btn-secondary-text)] transition hover:bg-[var(--btn-secondary-hover)] active:scale-[0.98]";

/** Active state for goal status buttons: use badge colors so selected option is obvious */
const goalStatusButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border px-4 py-2.5 text-[13px] font-medium transition active:scale-[0.98]";
const goalStatusActive = {
  onTrack: "border-[var(--badge-success-text)] bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)]",
  offTrack: "border-[var(--badge-warning-text)] bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)]",
  done: "border-[var(--badge-neutral-text)] bg-[var(--goal-btn-done-bg)] text-[var(--badge-neutral-text)]",
} as const;

const inputBase =
  "w-full rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[14px] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] transition focus:ring-2 focus:ring-[var(--ring)]";

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: "success" | "warning" | "neutral";
  label: string;
}) {
  const bgVar =
    status === "success"
      ? "var(--badge-success-bg)"
      : status === "warning"
        ? "var(--badge-warning-bg)"
        : "var(--badge-neutral-bg)";
  const textVar =
    status === "success"
      ? "var(--badge-success-text)"
      : status === "warning"
        ? "var(--badge-warning-text)"
        : "var(--badge-neutral-text)";
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ backgroundColor: bgVar, color: textVar }}
    >
      {label}
    </span>
  );
}

export { card, cardHeader, cardValue, btnPrimary, btnSecondary, goalStatusButtonBase, goalStatusActive, inputBase };
