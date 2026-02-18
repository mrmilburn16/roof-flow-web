import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

async function getSlackToken(): Promise<string | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("companies")
    .doc(COMPANY_ID)
    .collection("teams")
    .doc(TEAM_ID)
    .collection("config")
    .doc("slack")
    .get();
  const data = snap.data();
  return (data?.accessToken as string) ?? null;
}

/** GET: list public channels the app can see */
export async function GET() {
  const token = await getSlackToken();
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
  const token = await getSlackToken();
  if (!token) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 401 });
  }
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "") : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Channel name must be at least 2 characters (letters, numbers, hyphens, underscores)" }, { status: 400 });
  }
  const res = await fetch("https://slack.com/api/conversations.create", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; channel?: { id: string; name: string } };
  if (!data.ok) {
    const msg = data.error === "name_taken" ? "A channel with that name already exists." : (data.error || "Slack API error");
    return NextResponse.json({ error: msg }, { status: data.error === "name_taken" ? 409 : 502 });
  }
  return NextResponse.json({ channel: { id: data.channel!.id, name: data.channel!.name } });
}
