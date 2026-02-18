import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/slack/verify";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSlackConfig } from "@/lib/slack/config";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

const TITLE_MAX_LEN = 500;

/** Slack Events API: url_verification and message events. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload: {
    type?: string;
    challenge?: string;
    team_id?: string;
    event?: {
      type?: string;
      channel?: string;
      user?: string;
      text?: string;
      ts?: string;
      thread_ts?: string;
      bot_id?: string;
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Respond to url_verification immediately so Slack can verify the Request URL (no signature check needed for this).
  if (payload.type === "url_verification" && typeof payload.challenge === "string") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const signature = request.headers.get("x-slack-signature") ?? null;
  if (!SLACK_SIGNING_SECRET || !verifySlackRequest(rawBody, signature, SLACK_SIGNING_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  if (event.type !== "message") {
    return NextResponse.json({ ok: true });
  }

  if (event.bot_id) return NextResponse.json({ ok: true });
  if (event.thread_ts && event.thread_ts !== event.ts) return NextResponse.json({ ok: true });
  const text = (event.text ?? "").trim();
  if (!text) return NextResponse.json({ ok: true });

  const db = getAdminDb();
  if (!db) {
    console.warn("[Slack events] No Firestore (getAdminDb null). Set FIREBASE_SERVICE_ACCOUNT_JSON and ensure Firestore is enabled.");
    return NextResponse.json({ ok: true });
  }

  const config = await getSlackConfig();
  const channelId = config?.channelId ?? undefined;
  const token = config?.accessToken;
  if (!token) {
    console.warn("[Slack events] No Slack token in config. Reconnect Slack in Integrations and pick a channel.");
    return NextResponse.json({ ok: true });
  }
  if (!channelId) {
    console.warn("[Slack events] No to-do channel selected. In Integrations, pick a channel in the dropdown.");
    return NextResponse.json({ ok: true });
  }
  if (event.channel !== channelId) {
    return NextResponse.json({ ok: true });
  }

  const channelName = config?.channelName ?? "";
  const slackTeamId = config?.slackTeamId ?? "";
  if (slackTeamId && payload.team_id !== slackTeamId) {
    return NextResponse.json({ ok: true });
  }

  const existingSnap = await db
    .collection("companies")
    .doc(COMPANY_ID)
    .collection("teams")
    .doc(TEAM_ID)
    .collection("todos")
    .where("sourceMeta.slackMessageTs", "==", event.ts)
    .limit(1)
    .get();
  if (!existingSnap.empty) return NextResponse.json({ ok: true });

  const userRes = await fetch(`https://slack.com/api/users.info?user=${event.user}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userData = (await userRes.json()) as { ok?: boolean; user?: { real_name?: string; name?: string } };
  const slackUserDisplayName = userData.ok && userData.user ? (userData.user.real_name || userData.user.name || "Slack user") : "Slack user";

  const permalinkRes = await fetch(
    `https://slack.com/api/chat.getPermalink?channel=${event.channel}&message_ts=${event.ts}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const permalinkData = (await permalinkRes.json()) as { ok?: boolean; permalink?: string };
  const slackMessageUrl = permalinkData.ok && permalinkData.permalink ? permalinkData.permalink : undefined;

  const title = text.length > TITLE_MAX_LEN ? text.slice(0, TITLE_MAX_LEN - 1) + "…" : text;
  const now = new Date().toISOString();
  const todoId = `td_${crypto.randomUUID().slice(0, 10)}`;
  const todoRef = db
    .collection("companies")
    .doc(COMPANY_ID)
    .collection("teams")
    .doc(TEAM_ID)
    .collection("todos")
    .doc(todoId);
  try {
    await todoRef.set({
      id: todoId,
      title,
      status: "open",
      createdAt: now,
      source: "slack",
      sourceMeta: {
        slackChannelId: event.channel,
        slackChannelName: channelName,
        slackMessageTs: event.ts,
        slackMessageUrl,
        slackUserDisplayName,
      },
    });
  } catch (err) {
    console.error("[Slack events] Firestore write failed", err);
    return NextResponse.json({ ok: true });
  }

  console.info("[Slack events] Created to-do from message", { todoId, title: title.slice(0, 50), channel: event.channel });

  const replyRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      channel: event.channel,
      thread_ts: event.ts,
      text: `Created to-do: ${title}`,
    }),
  });
  if (!replyRes.ok) {
    try {
      const err = await replyRes.json();
      console.error("Slack chat.postMessage error", err);
    } catch {
      console.error("Slack chat.postMessage failed", replyRes.status);
    }
  }

  return NextResponse.json({ ok: true });
}
