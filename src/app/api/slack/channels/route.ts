import { NextRequest, NextResponse } from "next/server";
import { getSlackConfig } from "@/lib/slack/config";

/** GET: list public channels the app can see */
export async function GET() {
  const config = await getSlackConfig();
  const token = config?.accessToken ?? null;
  if (!token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 401 });
  }
  const res = await fetch("https://slack.com/api/conversations.list?limit=200&types=public_channel", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; channels?: { id: string; name: string; is_member?: boolean }[] };
  if (!data.ok) {
    return NextResponse.json({ error: data.error || "Slack API error" }, { status: 502 });
  }
  const channels = (data.channels ?? []).map((c) => ({ id: c.id, name: c.name, isMember: !!c.is_member }));
  return NextResponse.json({ channels });
}

/** POST: create a new public channel */
export async function POST(request: NextRequest) {
  const config = await getSlackConfig();
  const token = config?.accessToken ?? null;
  if (!token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = typeof body.name === "string" ? body.name.trim() : "";
  const name = raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  if (!name || name.length < 2) {
    return NextResponse.json({
      error: "Use at least 2 characters. Only letters, numbers, hyphens, and underscores (e.g. roof-flow-todos).",
    }, { status: 400 });
  }
  const res = await fetch("https://slack.com/api/conversations.create", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; channel?: { id: string; name: string } };
  if (!data.ok) {
    const slackError = (data.error ?? "unknown").toString();
    const msg =
      slackError === "name_taken"
        ? "A channel with that name already exists."
        : slackError === "invalid_name"
          ? "Channel name not allowed. Use only lowercase letters, numbers, hyphens, and underscores (e.g. roof-flow-todos)."
          : slackError;
    return NextResponse.json({ error: msg }, { status: slackError === "name_taken" ? 409 : 502 });
  }
  return NextResponse.json({ channel: { id: data.channel!.id, name: data.channel!.name } });
}
