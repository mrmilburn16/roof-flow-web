import { NextResponse } from "next/server";
import { getMicrosoftConfig } from "@/lib/microsoft/config";

/** GET: whether Microsoft 365 is connected, Outlook L10 event id, and optional Teams recap channel. */
export async function GET() {
  const config = await getMicrosoftConfig();
  if (!config?.accessToken) {
    return NextResponse.json({
      connected: false,
      outlookEventId: null,
      teamsTeamId: null,
      teamsChannelId: null,
      teamsChannelName: null,
    });
  }
  return NextResponse.json({
    connected: true,
    outlookEventId: config.outlookEventId ?? null,
    teamsTeamId: config.teamsTeamId ?? null,
    teamsChannelId: config.teamsChannelId ?? null,
    teamsChannelName: config.teamsChannelName ?? null,
  });
}
