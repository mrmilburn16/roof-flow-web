import { NextResponse } from "next/server";
import { getMicrosoftConfig } from "@/lib/microsoft/config";

/** GET: whether Microsoft 365 is connected and optional Outlook L10 event id. */
export async function GET() {
  const config = await getMicrosoftConfig();
  if (!config?.accessToken) {
    return NextResponse.json({ connected: false, outlookEventId: null });
  }
  return NextResponse.json({
    connected: true,
    outlookEventId: config.outlookEventId ?? null,
  });
}
