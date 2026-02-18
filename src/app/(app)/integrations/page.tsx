"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Building2, LayoutGrid, Cloud, Plug2, Plus, Check } from "lucide-react";
import { PageTitle, btnPrimary, btnSecondary, inputBase, Select } from "@/components/ui";

/** Slack from World Vector Logo; Acculynx, Buildertrend, Microsoft 365 icons disabled for now */
const LOGOS = {
  slack: "https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg",
  acculynx: null as string | null,
  buildertrend: null as string | null,
  microsoft365: null as string | null,
} as const;

function IntegrationLogo({
  logoUrl,
  fallbackIcon: Icon,
  sizeClass = "size-6",
  containerClass = "",
}: {
  logoUrl: string | null;
  fallbackIcon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  sizeClass?: string;
  containerClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showFallback = failed || logoUrl == null;
  if (showFallback) {
    return (
      <span className={`flex items-center justify-center ${containerClass}`}>
        <Icon className={sizeClass} strokeWidth={2} />
      </span>
    );
  }
  return (
    <img
      src={logoUrl}
      alt=""
      className={`object-contain ${sizeClass}`}
      onError={() => setFailed(true)}
    />
  );
}

type SlackStatus = { connected: boolean; channelId: string | null; channelName: string | null };
type SlackChannel = { id: string; name: string; isMember?: boolean };

const SLACK_STATUS_CACHE_KEY = "roofflow_slack_status";

function getCachedSlackStatus(): SlackStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const s = sessionStorage.getItem(SLACK_STATUS_CACHE_KEY);
    if (!s) return null;
    const p = JSON.parse(s) as SlackStatus;
    return p && typeof p.connected === "boolean" ? p : null;
  } catch {
    return null;
  }
}

function setCachedSlackStatus(status: SlackStatus): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SLACK_STATUS_CACHE_KEY, JSON.stringify(status));
  } catch {
    /* ignore */
  }
}

const ROADMAP = [
  {
    id: "acculynx",
    name: "Acculynx",
    description: "Sync jobs and schedules with your roofing workflow.",
    logoUrl: LOGOS.acculynx,
    icon: Building2,
  },
  {
    id: "buildertrend",
    name: "Buildertrend",
    description: "Connect project and client data to goals and meetings.",
    logoUrl: LOGOS.buildertrend,
    icon: LayoutGrid,
  },
  {
    id: "microsoft365",
    name: "Microsoft 365",
    description: "Calendar, Teams, and Outlook where you already work.",
    logoUrl: LOGOS.microsoft365,
    icon: Cloud,
  },
] as const;

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(() => getCachedSlackStatus());
  const [slackChannels, setSlackChannels] = useState<SlackChannel[] | null>(null);
  const [slackLoading, setSlackLoading] = useState(true);
  const [channelLoading, setChannelLoading] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [setChannelLoadingId, setSetChannelLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<"connected" | "error" | null>(null);
  const [playConnectedAnimation, setPlayConnectedAnimation] = useState(false);
  const connectedAnimatedRef = useRef(false);
  const slackSectionRef = useRef<HTMLElement>(null);
  const didScrollToSlackRef = useRef(false);

  useEffect(() => {
    const q = searchParams.get("slack");
    if (q === "connected") setMessage("connected");
    if (q === "error") setMessage("error");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/slack/status");
        if (cancelled) return;
        const data = (await res.json()) as SlackStatus;
        setSlackStatus(data);
        setCachedSlackStatus(data);
        if (data.connected) {
          setChannelLoading(true);
          const chRes = await fetch("/api/slack/channels");
          if (cancelled) return;
          const chData = (await chRes.json()) as { channels?: SlackChannel[] };
          setSlackChannels(chData.channels ?? []);
        }
      } catch {
        if (!cancelled) {
          const fallback = { connected: false, channelId: null, channelName: null };
          setSlackStatus(fallback);
          setCachedSlackStatus(fallback);
        }
      } finally {
        if (!cancelled) setSlackLoading(false); setChannelLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams.get("slack")]);

  const connectSlack = () => {
    window.location.href = "/api/slack/oauth";
  };

  const showAsConnected = Boolean(slackStatus?.connected || message === "connected");

  useEffect(() => {
    if (typeof window === "undefined" || connectedAnimatedRef.current) return;
    if (!showAsConnected || message !== "connected") return;
    if (window.localStorage.getItem("roofflow_slack_connected_animated") === "1") return;
    connectedAnimatedRef.current = true;
    setPlayConnectedAnimation(true);
    const t = setTimeout(() => {
      window.localStorage.setItem("roofflow_slack_connected_animated", "1");
      setPlayConnectedAnimation(false);
    }, 700);
    return () => clearTimeout(t);
  }, [showAsConnected, message]);

  useEffect(() => {
    if (message !== "connected" || didScrollToSlackRef.current) return;
    didScrollToSlackRef.current = true;
    const el = slackSectionRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [message]);

  const selectChannel = async (channelId: string, channelName: string) => {
    setSetChannelLoadingId(channelId);
    try {
      const res = await fetch("/api/slack/set-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, channelName }),
      });
      if (res.ok && slackStatus) setSlackStatus({ ...slackStatus, channelId, channelName });
    } finally {
      setSetChannelLoadingId(null);
    }
  };

  const createChannel = async () => {
    const name = newChannelName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!name || name.length < 2) return;
    setCreatingChannel(true);
    try {
      const res = await fetch("/api/slack/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { channel?: { id: string; name: string }; error?: string };
      if (data.channel) {
        setSlackChannels((prev) => (prev ?? []).concat([{ id: data.channel!.id, name: data.channel!.name }]));
        await selectChannel(data.channel.id, data.channel.name);
        setNewChannelName("");
      } else {
        alert(data.error || (res.ok ? "" : `Request failed (${res.status}). Check that the Slack app has the channels:manage scope and was reinstalled.`));
      }
    } catch (e) {
      alert("Could not create channel. Check the network and try again.");
    } finally {
      setCreatingChannel(false);
    }
  };

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
            Roof Flow will plug into the tools you already use.
            <br />
            First up: Slack.
            <br />
            Then Acculynx, Buildertrend, and Microsoft 365.
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

      {/* Slack */}
      <section ref={slackSectionRef} className="space-y-4" aria-label="Slack integration">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--badge-info-bg)] text-[12px] font-bold text-[var(--badge-info-text)]">
            1
          </span>
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Slack
          </h2>
        </div>
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--badge-info-text)]/20 bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-8"
          style={{
            boxShadow: "var(--shadow-card), 0 0 0 1px var(--badge-info-text) inset",
          }}
        >
          <div className="flex gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--badge-info-text)]/30 bg-[var(--surface)] p-2.5 text-[var(--badge-info-text)]"
              aria-hidden
            >
              <IntegrationLogo logoUrl={LOGOS.slack} fallbackIcon={MessageCircle} sizeClass="size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">Slack</h3>
                {showAsConnected && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full bg-[var(--badge-success-bg)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--badge-success-text)] ${playConnectedAnimation ? "slack-connected-celebrate" : ""}`}
                    aria-live="polite"
                    aria-label="Slack connected"
                  >
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                    Connected
                  </span>
                )}
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--helper-text)]">
                Post in a channel to create to-dos. We show who added each item and link back to the message.
              </p>
              {message === "error" && (
                <p className="mt-2 text-[14px] text-[var(--badge-warning-text)]">Slack connection failed. Try again.</p>
              )}
              {message === "connected" && !slackStatus?.connected && !slackLoading && (
                <p className="mt-2 text-[13px] text-[var(--text-muted)]">If channels don’t load, the connection may not have been saved. <button type="button" onClick={connectSlack} className="font-medium text-[var(--badge-info-text)] underline hover:no-underline">Reconnect</button></p>
              )}
              {!showAsConnected && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={connectSlack} className={btnPrimary + " inline-flex gap-2"}>
                    <MessageCircle className="size-4" />
                    Connect to Slack
                  </button>
                  {slackLoading && (
                    <span className="text-[13px] text-[var(--text-muted)]">Checking connection…</span>
                  )}
                </div>
              )}
              {showAsConnected && (
                <div className="mt-6">
                  <div className="text-[13px] font-medium text-[var(--text-secondary)]">To-do channel</div>
                  <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                    Messages in the selected channel become to-dos. Invite the Roof Flow app to the channel in Slack if needed.
                  </p>
                  {!slackStatus?.channelId && !slackLoading && (
                    <p className="mt-2 rounded-[var(--radius)] border border-[var(--badge-warning-text)]/40 bg-[var(--badge-warning-bg)] px-3 py-2 text-[13px] text-[var(--badge-warning-text)]">
                      Pick a channel below so messages there become to-dos. Until you pick one, new Slack messages won’t create to-dos.
                    </p>
                  )}
                  {slackLoading ? (
                    <p className="mt-3 text-[13px] text-[var(--text-muted)]">Setting up…</p>
                  ) : channelLoading ? (
                    <p className="mt-3 text-[13px] text-[var(--text-muted)]">Loading channels…</p>
                  ) : (
                    <div className="mt-3 space-y-4">
                      <div>
                        <label htmlFor="slack-channel-select" className="block text-[13px] font-medium text-[var(--text-secondary)]">
                          Select channel
                        </label>
                        <Select
                          id="slack-channel-select"
                          aria-label="To-do channel"
                          value={slackStatus?.channelId ?? ""}
                          onChange={(channelId) => {
                            const ch = (slackChannels ?? []).find((c) => c.id === channelId);
                            if (ch) selectChannel(ch.id, ch.name);
                          }}
                          options={(slackChannels ?? []).map((ch) => ({ value: ch.id, label: `#${ch.name}` }))}
                          placeholder="Choose a channel…"
                          emptyMessage="No channels found"
                          className="mt-1.5 w-full min-w-[20rem] max-w-md"
                          disabled={setChannelLoadingId !== null}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                        <span className="text-[13px] text-[var(--text-muted)]">Create a new channel in Slack:</span>
                        <input
                          type="text"
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="e.g. roof-flow-todos"
                          className={inputBase + " w-48"}
                          aria-label="New channel name"
                        />
                        <span className="text-[12px] text-[var(--text-muted)]">Letters, numbers, hyphens, underscores</span>
                        <button
                          type="button"
                          onClick={createChannel}
                          disabled={creatingChannel || newChannelName.trim().length < 2}
                          className={btnSecondary + " inline-flex gap-1"}
                        >
                          <Plus className="size-4" />
                          Create channel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
          {ROADMAP.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:border-[var(--text-muted)]/40 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted-bg)] p-2 text-[var(--text-muted)]">
                  <IntegrationLogo
                    logoUrl={item.logoUrl}
                    fallbackIcon={item.icon}
                    sizeClass="size-8"
                  />
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
            ))}
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

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--text-muted)]">Loading…</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
