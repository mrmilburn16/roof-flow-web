import { NextRequest, NextResponse } from "next/server";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_SCOPES =
  "channels:read,channels:manage,chat:write,groups:read,users:read";

export function GET(_request: NextRequest) {
  if (!SLACK_CLIENT_ID) {
    return NextResponse.json(
      { error: "Slack integration not configured. Set SLACK_CLIENT_ID." },
      { status: 503 }
    );
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/slack/callback`;
  const state = crypto.randomUUID();
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", SLACK_CLIENT_ID);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
