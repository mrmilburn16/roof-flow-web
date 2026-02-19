import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";
import { getAdminDb } from "@/lib/firebase/admin";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

export type MicrosoftConfig = {
  accessToken: string;
  /** May be empty if Microsoft did not return one (e.g. some account types). */
  refreshToken: string;
  /** Expiration time in milliseconds (Date.now()). We refresh when within 5 min of expiry. */
  expiresAt: number;
  outlookEventId?: string | null;
  /** Teams channel for posting meeting recap (optional). */
  teamsTeamId?: string | null;
  teamsChannelId?: string | null;
  teamsChannelName?: string | null;
};

const key = () => `microsoft:${COMPANY_ID}:${TEAM_ID}`;

const memoryStore = new Map<string, MicrosoftConfig>();

/** Path to local file fallback when Firestore is not configured (dev). File is gitignored. */
function getFileFallbackPath(): string {
  return join(process.cwd(), ".microsoft-config.json");
}

/** Read from file fallback. Returns null on missing or parse error. */
async function getMicrosoftConfigFromFile(): Promise<MicrosoftConfig | null> {
  try {
    const path = getFileFallbackPath();
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const accessToken = data?.accessToken as string | undefined;
    const expiresAt = data?.expiresAt as number | undefined;
    if (!accessToken || typeof expiresAt !== "number") return null;
    return {
      accessToken,
      refreshToken: (data?.refreshToken as string) ?? "",
      expiresAt,
      outlookEventId: (data?.outlookEventId as string) ?? null,
      teamsTeamId: (data?.teamsTeamId as string) ?? null,
      teamsChannelId: (data?.teamsChannelId as string) ?? null,
      teamsChannelName: (data?.teamsChannelName as string) ?? null,
    };
  } catch {
    return null;
  }
}

/** Write to file fallback. */
async function setMicrosoftConfigFile(config: MicrosoftConfig): Promise<void> {
  try {
    const path = getFileFallbackPath();
    await writeFile(
      path,
      JSON.stringify({
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: config.expiresAt,
        outlookEventId: config.outlookEventId ?? null,
        teamsTeamId: config.teamsTeamId ?? null,
        teamsChannelId: config.teamsChannelId ?? null,
        teamsChannelName: config.teamsChannelName ?? null,
      }),
      "utf-8"
    );
  } catch (err) {
    console.error("Microsoft config: failed to write file fallback", err);
  }
}

/** Delete file fallback (internal). */
async function deleteMicrosoftConfigFile(): Promise<void> {
  try {
    await unlink(getFileFallbackPath());
  } catch {
    /* ignore */
  }
}

/** Base URL for Microsoft token endpoint (common = multi-tenant). */
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

/** Refresh access token using refresh_token. Returns new config or null on failure. */
async function refreshAccessToken(config: MicrosoftConfig): Promise<MicrosoftConfig | null> {
  if (!config.refreshToken || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) return null;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (data.error || !data.access_token) return null;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  const expiresAt = Date.now() + expiresIn * 1000 - 5 * 60 * 1000; // 5 min buffer
  const next: MicrosoftConfig = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
    expiresAt,
    outlookEventId: config.outlookEventId,
    teamsTeamId: config.teamsTeamId,
    teamsChannelId: config.teamsChannelId,
    teamsChannelName: config.teamsChannelName,
  };
  return next;
}

/** Read Microsoft config: Firestore first, then in-memory fallback. */
export async function getMicrosoftConfig(): Promise<MicrosoftConfig | null> {
  const db = getAdminDb();
  if (db) {
    const snap = await db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("microsoft")
      .get();
    const data = snap.data();
    const accessToken = data?.accessToken as string | undefined;
    const refreshToken = (data?.refreshToken as string | undefined) ?? "";
    const expiresAt = data?.expiresAt as number | undefined;
    if (accessToken && typeof expiresAt === "number") {
      return {
        accessToken,
        refreshToken,
        expiresAt,
        outlookEventId: (data?.outlookEventId as string) ?? null,
        teamsTeamId: (data?.teamsTeamId as string) ?? null,
        teamsChannelId: (data?.teamsChannelId as string) ?? null,
        teamsChannelName: (data?.teamsChannelName as string) ?? null,
      };
    }
  }
  const mem = memoryStore.get(key());
  if (mem) return mem;
  const file = await getMicrosoftConfigFromFile();
  if (file) memoryStore.set(key(), file);
  return file;
}

/**
 * Get config with a valid access token. If the token is expired or within 5 min of expiry,
 * refreshes and persists the new tokens, then returns the updated config.
 */
export async function getValidAccessToken(): Promise<MicrosoftConfig | null> {
  const config = await getMicrosoftConfig();
  if (!config) return null;
  const now = Date.now();
  if (config.expiresAt > now + 5 * 60 * 1000) return config; // More than 5 min left
  const refreshed = await refreshAccessToken(config);
  if (!refreshed) return config; // Use existing token as fallback
  await setMicrosoftConfig(refreshed);
  return refreshed;
}

/** Persist Microsoft config to Firestore, memory, and file fallback. */
export async function setMicrosoftConfig(config: MicrosoftConfig): Promise<void> {
  const db = getAdminDb();
  if (db) {
    const ref = db
      .collection("companies")
      .doc(COMPANY_ID)
      .collection("teams")
      .doc(TEAM_ID)
      .collection("config")
      .doc("microsoft");
    await ref.set({
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: config.expiresAt,
      outlookEventId: config.outlookEventId ?? null,
      teamsTeamId: config.teamsTeamId ?? null,
      teamsChannelId: config.teamsChannelId ?? null,
      teamsChannelName: config.teamsChannelName ?? null,
      updatedAt: new Date().toISOString(),
    });
  }
  setMicrosoftConfigMemory(config);
  await setMicrosoftConfigFile(config);
}

/** Write Microsoft config to in-memory fallback. */
export function setMicrosoftConfigMemory(config: MicrosoftConfig): void {
  memoryStore.set(key(), config);
}

/** Update outlookEventId in stored config. */
export async function setMicrosoftOutlookEventId(eventId: string | null): Promise<void> {
  const config = await getMicrosoftConfig();
  if (!config) return;
  const next = { ...config, outlookEventId: eventId };
  await setMicrosoftConfig(next);
}

/** Update Teams channel for recap in stored config. */
export async function setMicrosoftTeamsChannel(teamId: string | null, channelId: string | null, channelName?: string | null): Promise<void> {
  const config = await getMicrosoftConfig();
  if (!config) return;
  const next = {
    ...config,
    teamsTeamId: teamId ?? null,
    teamsChannelId: channelId ?? null,
    teamsChannelName: channelName ?? null,
  };
  await setMicrosoftConfig(next);
}

/** Clear in-memory Microsoft config. */
export function clearMicrosoftConfigMemory(): void {
  memoryStore.delete(key());
}

/** Clear file fallback (call from disconnect so config is fully removed). */
export async function clearMicrosoftConfigFile(): Promise<void> {
  await deleteMicrosoftConfigFile();
}
