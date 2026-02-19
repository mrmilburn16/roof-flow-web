import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/microsoft/config";
import { getMeEmail, sendMail, postChannelMessage } from "@/lib/microsoft/graph";

export type SendRecapBody = {
  /** Email subject (e.g. "L10 Recap — Week of Feb 24, 2026"). */
  subject: string;
  /** Recap plain text (title, week, notes, to-dos, resolved issues). */
  body: string;
  /** If true, send email to the connected user's address (default true). */
  sendCopyToMe?: boolean;
  /** If true, also post recap to the configured Teams channel. */
  postToTeams?: boolean;
};

/**
 * POST: Send meeting recap by email (Outlook) and/or post to Teams channel.
 * Requires Microsoft connected; Mail.Send for email; Teams channel must be set in config for postToTeams.
 */
export async function POST(request: NextRequest) {
  const config = await getValidAccessToken();
  if (!config?.accessToken) {
    return NextResponse.json(
      { error: "Microsoft 365 is not connected. Connect in Integrations first." },
      { status: 401 }
    );
  }

  let json: SendRecapBody;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const subject = typeof json.subject === "string" ? json.subject.trim() : "";
  let body = typeof json.body === "string" ? json.body : "";
  const sendCopyToMe = json.sendCopyToMe !== false;
  const postToTeams = Boolean(json.postToTeams);

  if (!subject || !body) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || null;
  if (appUrl) body = `${body}\n\n— Roof Flow\n${appUrl}`;

  const errors: string[] = [];

  if (sendCopyToMe) {
    try {
      const to = await getMeEmail(config.accessToken);
      await sendMail(config.accessToken, {
        to,
        subject,
        body,
        saveToSentItems: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send email";
      errors.push(`Email: ${message}`);
    }
  }

  if (postToTeams && config.teamsTeamId && config.teamsChannelId) {
    try {
      await postChannelMessage(
        config.accessToken,
        config.teamsTeamId,
        config.teamsChannelId,
        body
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to post to Teams";
      errors.push(`Teams: ${message}`);
    }
  } else if (postToTeams && (!config.teamsTeamId || !config.teamsChannelId)) {
    errors.push("Teams: No channel selected. Set one in Integrations.");
  }

  if (errors.length > 0) {
    const partialSuccess = (sendCopyToMe && !errors.some((e) => e.startsWith("Email:"))) ||
      (postToTeams && !errors.some((e) => e.startsWith("Teams:")));
    return NextResponse.json(
      { error: errors.join(" "), partial: partialSuccess },
      { status: partialSuccess ? 207 : 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    email: sendCopyToMe,
    teams: postToTeams,
  });
}
