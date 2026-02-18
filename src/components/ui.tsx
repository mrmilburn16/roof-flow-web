const card = "rounded-[var(--card-radius)] bg-[var(--surface)] shadow-[var(--card-shadow)]";

const cardHeader = "text-[13px] font-medium tracking-[-0.01em] text-[var(--text-secondary)]";

const cardValue = "mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]";

const btnPrimary =
  "cursor-pointer inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--btn-primary-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--btn-primary-text)] transition hover:opacity-90 active:scale-[0.98]";

const btnSecondary =
  "cursor-pointer inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--btn-secondary-border)] bg-[var(--btn-secondary-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--btn-secondary-text)] transition hover:bg-[var(--btn-secondary-hover)] active:scale-[0.98]";

const btnDanger =
  "cursor-pointer inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border border-transparent bg-[var(--btn-danger-bg)] px-3 py-2.5 text-[13px] font-medium text-[var(--btn-danger-text)] transition hover:bg-[var(--btn-danger-hover)] active:scale-[0.98]";

/** Active state for goal status buttons: use badge colors so selected option is obvious */
const goalStatusButtonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-2.5 text-[13px] font-medium transition active:scale-[0.98]";
const goalStatusActive = {
  onTrack: "border-[var(--badge-success-text)] bg-[var(--goal-btn-on-bg)] text-[var(--badge-success-text)]",
  offTrack: "border-[var(--badge-warning-text)] bg-[var(--goal-btn-off-bg)] text-[var(--badge-warning-text)]",
  done: "border-[var(--goal-btn-done-text)] bg-[var(--goal-btn-done-bg)] text-[var(--goal-btn-done-text)]",
} as const;

/** Inactive state for goal status pills: outline style so unselected options don’t look plain grey */
const goalStatusInactive =
  "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:bg-[var(--muted-bg)]";

const inputBase =
  "w-full rounded-[var(--radius)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[14px] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] outline-none transition-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--input-border)]";

export function PageTitle({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  if (!title && !subtitle) return null;
  return (
    <div>
      {title ? (
        <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className={title ? "mt-1 text-[14px] leading-relaxed text-[var(--helper-text)]" : "text-[14px] leading-relaxed text-[var(--helper-text)]"}>
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
  status: "success" | "warning" | "neutral" | "done";
  label: string;
}) {
  const bgVar =
    status === "success"
      ? "var(--badge-success-bg)"
      : status === "warning"
        ? "var(--badge-warning-bg)"
        : status === "done"
          ? "var(--goal-btn-done-bg)"
          : "var(--badge-neutral-bg)";
  const textVar =
    status === "success"
      ? "var(--badge-success-text)"
      : status === "warning"
        ? "var(--badge-warning-text)"
        : status === "done"
          ? "var(--goal-btn-done-text)"
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

export {
  card,
  cardHeader,
  cardValue,
  btnPrimary,
  btnSecondary,
  btnDanger,
  goalStatusButtonBase,
  goalStatusActive,
  goalStatusInactive,
  inputBase,
};
