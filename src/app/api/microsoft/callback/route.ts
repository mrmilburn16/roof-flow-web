import { NextRequest, NextResponse } from "next/server";
import { getMicrosoftConfig, setMicrosoftConfig, setMicrosoftConfigMemory } from "@/lib/microsoft/config";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

function getAbsoluteAppUrl(): string {
  let base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  if (error) {
    const params = new URLSearchParams({ microsoft: "error" });
    if (errorDescription) params.set("message", errorDescription);
    return NextResponse.redirect(`${getAbsoluteAppUrl()}/integrations?${params.toString()}`);
  }
  if (!code || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Missing code or Microsoft credentials." },
      { status: 400 }
    );
  }

  const baseUrl = getAbsoluteAppUrl();
  const redirectUri = `${baseUrl}/api/microsoft/callback`;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  let data: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    const text = await res.text();
    console.error("Microsoft token response (not JSON):", res.status, text?.slice(0, 200));
    return NextResponse.redirect(
      `${getAbsoluteAppUrl()}/integrations?microsoft=error&message=${encodeURIComponent("Token response was not JSON")}`
    );
  }
  if (data.error) {
    const msg = data.error_description || data.error || "Token exchange failed";
    console.error("Microsoft token error:", data.error, data.error_description, "redirect_uri used:", redirectUri);
    return NextResponse.redirect(
      `${getAbsoluteAppUrl()}/integrations?microsoft=error&message=${encodeURIComponent(msg)}`
    );
  }
  if (!data.access_token) {
    console.error("Microsoft token response: no access_token. Keys:", Object.keys(data), "redirect_uri used:", redirectUri);
    return NextResponse.redirect(
      `${getAbsoluteAppUrl()}/integrations?microsoft=error&message=${encodeURIComponent(data.error_description || "No access token in response")}`
    );
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const expiresAt = Date.now() + expiresIn * 1000 - 5 * 60 * 1000;
  const config = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt,
    outlookEventId: null as string | null,
  };

  const appUrl = getAbsoluteAppUrl();
  try {
    await setMicrosoftConfig(config);
  } catch (err) {
    console.error("Microsoft callback: failed to store config", err);
    setMicrosoftConfigMemory(config);
    return NextResponse.redirect(`${appUrl}/integrations?microsoft=connected&storage=failed`);
  }

  return NextResponse.redirect(`${appUrl}/integrations?microsoft=connected`);
}
