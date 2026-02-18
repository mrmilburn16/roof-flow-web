import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/integrations?slack=error`);
  }
  if (!code || !SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Missing code or Slack credentials." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/slack/callback`;

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    team?: { id: string; name?: string };
  };
  if (!data.ok || !data.access_token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/integrations?slack=error&message=${encodeURIComponent(data.error || "Unknown error")}`);
  }

  const db = getAdminDb();
  if (db) {
    const ref = db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("slack");
    await ref.set({
      slackTeamId: data.team?.id ?? "",
      accessToken: data.access_token,
      updatedAt: new Date().toISOString(),
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/integrations?slack=connected`);
}
