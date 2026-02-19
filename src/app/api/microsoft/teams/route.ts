import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/microsoft/config";
import { listJoinedTeams } from "@/lib/microsoft/graph";

/** GET: List teams the signed-in user has joined (for channel picker). */
export async function GET() {
  const config = await getValidAccessToken();
  if (!config?.accessToken) {
    return NextResponse.json(
      { error: "Microsoft 365 is not connected." },
      { status: 401 }
    );
  }

  try {
    const teams = await listJoinedTeams(config.accessToken);
    return NextResponse.json({ teams });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list teams";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
