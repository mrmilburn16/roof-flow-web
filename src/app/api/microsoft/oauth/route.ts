import { NextRequest, NextResponse } from "next/server";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;

/** Delegated scopes: sign-in, profile, and calendar read/write for L10 sync. */
const SCOPES = "openid profile User.Read Calendars.ReadWrite";

export function GET(_request: NextRequest) {
  if (!MICROSOFT_CLIENT_ID) {
    return NextResponse.json(
      { error: "Microsoft 365 integration not configured. Set MICROSOFT_CLIENT_ID." },
      { status: 503 }
    );
  }
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;
  const redirectUri = `${baseUrl}/api/microsoft/callback`;
  const state = crypto.randomUUID();
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url.toString());
}
