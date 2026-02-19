import { NextRequest, NextResponse } from "next/server";
import { setMicrosoftTeamsChannel } from "@/lib/microsoft/config";

export type SetTeamsChannelBody = {
  teamId: string | null;
  channelId: string | null;
  channelName?: string | null;
};

/** POST: Save the selected Teams channel for meeting recap. */
export async function POST(request: NextRequest) {
  let json: SetTeamsChannelBody;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const teamId = json.teamId === undefined ? null : String(json.teamId || "").trim() || null;
  const channelId = json.channelId === undefined ? null : String(json.channelId || "").trim() || null;
  const channelName =
    json.channelName === undefined ? null : String(json.channelName || "").trim() || null;

  await setMicrosoftTeamsChannel(teamId, channelId, channelName);

  return NextResponse.json({
    ok: true,
    teamsChannelId: channelId,
    teamsChannelName: channelName ?? undefined,
  });
}
