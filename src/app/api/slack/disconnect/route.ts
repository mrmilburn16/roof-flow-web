import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { clearSlackConfigMemory } from "@/lib/slack/config";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

/** POST: disconnect Slack — remove stored token and channel. Next Connect to Slack will re-authorize. */
export async function POST() {
  const db = getAdminDb();
  if (db) {
    const ref = db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("slack");
    await ref.delete();
  }
  clearSlackConfigMemory();
  return NextResponse.json({ ok: true });
}
