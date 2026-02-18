import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

/** POST: save the selected channel for to-do creation */
export async function POST(request: NextRequest) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured for Slack" }, { status: 503 });
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
  return NextResponse.json({ ok: true });
}
