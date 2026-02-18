import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSlackConfig, setSlackChannelMemory } from "@/lib/slack/config";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

/** POST: save the selected channel for to-do creation */
export async function POST(request: NextRequest) {
  const config = await getSlackConfig();
  if (!config?.accessToken) {
    return NextResponse.json({ error: "Slack not connected" }, { status: 401 });
  }
  let body: { channelId?: string; channelName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const channelId = typeof body.channelId === "string" ? body.channelId.trim() : "";
  const channelName = typeof body.channelName === "string" ? body.channelName.trim() : "";
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }
  const db = getAdminDb();
  if (db) {
    const ref = db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("slack");
    await ref.set(
      { channelId, channelName, channelUpdatedAt: new Date().toISOString() },
      { merge: true }
    );
  } else {
    setSlackChannelMemory(channelId, channelName);
  }
  return NextResponse.json({ ok: true });
}
