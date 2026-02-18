"use client";

import { MessageCircle, Building2, LayoutGrid, Cloud, Plug2, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/ui";

const IN_DEV = {
  id: "slack",
  name: "Slack",
  description: "Get meeting recaps, to-dos, and scorecard updates in your channels. We're building it.",
  icon: MessageCircle,
  status: "in_development" as const,
};

const ROADMAP = [
  {
    id: "acculynx",
    name: "Acculynx",
    description: "Sync jobs and schedules with your roofing workflow.",
    icon: Building2,
  },
  {
    id: "buildertrend",
    name: "Buildertrend",
    description: "Connect project and client data to goals and meetings.",
    icon: LayoutGrid,
  },
  {
    id: "microsoft365",
    name: "Microsoft 365",
    description: "Calendar, Teams, and Outlook where you already work.",
    icon: Cloud,
  },
] as const;

export default function IntegrationsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-8 py-12 shadow-[var(--shadow-card)] sm:px-12 sm:py-16">
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-[var(--badge-info-text)]">
            <Plug2 className="size-5" aria-hidden />
            <span className="text-[13px] font-semibold uppercase tracking-wider">Integrations</span>
          </div>
          <h1 className="mt-4 text-[28px] font-bold tracking-tight text-[var(--text-primary)] sm:text-[34px]">
            Connect your stack
          </h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-[var(--helper-text)]">
            RoofFlow will plug into the tools you already use. First up: Slack. Then Acculynx, Buildertrend, and Microsoft 365.
          </p>
        </div>
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.06]"
          style={{ background: "var(--badge-info-text)" }}
          aria-hidden
        />
        <div
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-[0.04]"
          style={{ background: "var(--badge-info-text)" }}
          aria-hidden
        />
      </div>

      <PageTitle
        title="Roadmap"
        subtitle="What we're building and what's next. No ETA spam — just the order we're tackling."
      />

      {/* In development */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--badge-info-bg)] text-[12px] font-bold text-[var(--badge-info-text)]">
            1
          </span>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            In development
          </h2>
        </div>
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--badge-info-text)]/20 bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-8"
          style={{
            boxShadow: "var(--shadow-card), 0 0 0 1px var(--badge-info-text) inset",
          }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--badge-info-text)]/30 bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]"
                aria-hidden
              >
                <IN_DEV.icon className="size-7" strokeWidth={2} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
                    {IN_DEV.name}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--badge-info-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--badge-info-text)]">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--badge-info-text)] opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-[var(--badge-info-text)]" />
                    </span>
                    Building
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--helper-text)]">
                  {IN_DEV.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--muted-bg)] px-4 py-2 text-[13px] text-[var(--text-secondary)] sm:shrink-0">
              <Sparkles className="size-4 text-[var(--badge-info-text)]" aria-hidden />
              <span>We're on it</span>
            </div>
          </div>
        </div>
      </section>

      {/* Coming next */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--muted-bg)] text-[12px] font-bold text-[var(--text-muted)]">
            2
          </span>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Coming next
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {ROADMAP.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:border-[var(--text-muted)]/40 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted-bg)] text-[var(--text-muted)]">
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-primary)]">
                  {item.name}
                </h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--helper-text)]">
                  {item.description}
                </p>
                <p className="mt-4 text-[12px] font-medium text-[var(--text-muted)]">
                  On the roadmap
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer line */}
      <p className="text-center text-[13px] text-[var(--helper-text)]">
        Want something else? Use{" "}
        <span className="font-medium text-[var(--text-secondary)]">Give feedback</span> in the
        sidebar and tell us which integration you need.
      </p>
    </div>
  );
}
