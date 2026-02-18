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

  // Log every request so you can confirm in Vercel Logs that Slack is hitting this URL.
  console.info("[Slack events] Request received", {
    type: payload.type,
    event_type: payload.event?.type,
    channel: payload.event?.channel,
  });

  // Respond to url_verification immediately so Slack can verify the Request URL (no signature check needed for this).
  if (payload.type === "url_verification" && typeof payload.challenge === "string") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const signature = request.headers.get("x-slack-signature") ?? null;
  if (!SLACK_SIGNING_SECRET || !verifySlackRequest(rawBody, signature, SLACK_SIGNING_SECRET)) {
    console.info("[Slack events] Rejected: invalid or missing signature (check SLACK_SIGNING_SECRET)");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  if (event.type !== "message") {
    return NextResponse.json({ ok: true });
  }

  console.info("[Slack events] Signature OK, handling message", { channel: event.channel, has_bot_id: !!event.bot_id, thread_ts: event.thread_ts, text_len: (event.text ?? "").length });

  if (event.bot_id) {
    console.info("[Slack events] Skip: bot message");
    return NextResponse.json({ ok: true });
  }
  if (event.thread_ts && event.thread_ts !== event.ts) {
    console.info("[Slack events] Skip: reply in thread (only top-level messages create to-dos)");
    return NextResponse.json({ ok: true });
  }
  const text = (event.text ?? "").trim();
  if (!text) {
    console.info("[Slack events] Skip: empty message text");
    return NextResponse.json({ ok: true });
  }

  try {
    const db = getAdminDb();
    if (!db) {
    console.info("[Slack events] Skip: No Firestore. Set FIREBASE_SERVICE_ACCOUNT_JSON and ensure Firestore is enabled.");
    return NextResponse.json({ ok: true });
  }

  const config = await getSlackConfig();
  const channelId = config?.channelId ?? undefined;
  const token = config?.accessToken;
  if (!token) {
    console.info("[Slack events] Skip: No Slack token. Reconnect Slack in Integrations and pick a channel.");
    return NextResponse.json({ ok: true });
  }
  if (!channelId) {
    console.info("[Slack events] Skip: No to-do channel selected. In Integrations, pick a channel in the dropdown.");
    return NextResponse.json({ ok: true });
  }
  if (event.channel !== channelId) {
    console.info("[Slack events] Skip: Channel mismatch. Message from", event.channel, "but to-do channel is", channelId, "— select that channel in Integrations.");
    return NextResponse.json({ ok: true });
  }

  const channelName = config?.channelName ?? "";
  const slackTeamId = config?.slackTeamId ?? "";
  if (slackTeamId && payload.team_id !== slackTeamId) {
    console.info("[Slack events] Skip: Team mismatch. Event team_id", payload.team_id, "vs config", slackTeamId);
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
  if (!existingSnap.empty) {
    console.info("[Slack events] Skipping duplicate message", event.ts);
    return NextResponse.json({ ok: true });
  }

  console.info("[Slack events] Creating to-do for channel", event.channel, "title:", text.slice(0, 50));

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
  } catch (err) {
    console.info("[Slack events] Error while processing message", err);
    return NextResponse.json({ ok: true });
  }
}
