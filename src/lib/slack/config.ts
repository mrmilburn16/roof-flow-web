import { getAdminDb } from "@/lib/firebase/admin";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

export type SlackConfig = {
  accessToken: string;
  slackTeamId: string;
  channelId?: string | null;
  channelName?: string | null;
};

const key = () => `${COMPANY_ID}:${TEAM_ID}`;

/** In-memory fallback when Firestore is not configured (e.g. Vercel without Firebase). Persists only for the lifetime of the server process. */
const memoryStore = new Map<string, SlackConfig>();

/** Read Slack config: Firestore first, then in-memory fallback. */
export async function getSlackConfig(): Promise<SlackConfig | null> {
  const db = getAdminDb();
  if (db) {
    const snap = await db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("slack")
      .get();
    const data = snap.data();
    const token = data?.accessToken as string | undefined;
    if (token) {
      return {
        accessToken: token,
        slackTeamId: (data?.slackTeamId as string) ?? "",
        channelId: (data?.channelId as string) ?? null,
        channelName: (data?.channelName as string) ?? null,
      };
    }
  }
  const mem = memoryStore.get(key());
  return mem ?? null;
}

/** Write Slack config to in-memory fallback (used when Firestore is not available). */
export function setSlackConfigMemory(config: SlackConfig): void {
  memoryStore.set(key(), config);
}

/** Merge channel selection into in-memory config (when using fallback). */
export function setSlackChannelMemory(channelId: string, channelName: string): void {
  const existing = memoryStore.get(key());
  if (existing) {
    memoryStore.set(key(), { ...existing, channelId, channelName });
  }
}
