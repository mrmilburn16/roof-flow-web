import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/microsoft/config";
import { listChannels } from "@/lib/microsoft/graph";

/** GET: List channels in a team (for channel picker). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const config = await getValidAccessToken();
  if (!config?.accessToken) {
    return NextResponse.json(
      { error: "Microsoft 365 is not connected." },
      { status: 401 }
    );
  }

  const { teamId } = await params;
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  try {
    const channels = await listChannels(config.accessToken, teamId);
    return NextResponse.json({ channels });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list channels";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
