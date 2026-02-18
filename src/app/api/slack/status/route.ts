import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

/** GET: whether Slack is connected and which channel is selected */
export async function GET() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ connected: false, channelId: null, channelName: null });
  }
  const snap = await db
    .collection("companies")
    .doc(COMPANY_ID)
    .collection("teams")
    .doc(TEAM_ID)
    .collection("config")
    .doc("slack")
    .get();
  const data = snap.data();
  const hasToken = Boolean(data?.accessToken);
  return NextResponse.json({
    connected: hasToken,
    channelId: data?.channelId ?? null,
    channelName: data?.channelName ?? null,
  });
}
