import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { clearMicrosoftConfigMemory, clearMicrosoftConfigFile } from "@/lib/microsoft/config";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

/** POST: disconnect Microsoft 365 — remove stored tokens. Next Connect will re-authorize. */
export async function POST() {
  const db = getAdminDb();
  if (db) {
    const ref = db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("microsoft");
    await ref.delete();
  }
  clearMicrosoftConfigMemory();
  await clearMicrosoftConfigFile();
  return NextResponse.json({ ok: true });
}
