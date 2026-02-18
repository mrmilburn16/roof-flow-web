import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
          <Icon className="size-6 text-[var(--text-muted)]" />
        </div>
      )}
      <p className={`text-[14px] font-medium text-[var(--text-primary)] ${Icon ? "mt-4" : ""}`}>{title}</p>
      <p className="mt-1 text-[13px] text-[var(--helper-text)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
