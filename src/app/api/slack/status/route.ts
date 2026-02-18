import { NextResponse } from "next/server";
import { getSlackConfig } from "@/lib/slack/config";

/** GET: whether Slack is connected and which channel is selected */
export async function GET() {
  const config = await getSlackConfig();
  if (!config?.accessToken) {
    return NextResponse.json({ connected: false, channelId: null, channelName: null });
  }
  return NextResponse.json({
    connected: true,
    channelId: config.channelId ?? null,
    channelName: config.channelName ?? null,
  });
}
