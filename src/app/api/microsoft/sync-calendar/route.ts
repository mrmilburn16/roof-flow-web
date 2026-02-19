import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  getValidAccessToken,
  setMicrosoftOutlookEventId,
  getMicrosoftConfig,
} from "@/lib/microsoft/config";
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/microsoft/graph";
import type { MeetingSchedule } from "@/lib/domain";

const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "c_roofco";
const TEAM_ID = process.env.NEXT_PUBLIC_TEAM_ID || "t_leadership";

type RequestBody = {
  title?: string;
  schedule?: MeetingSchedule;
  /** IANA timezone (e.g. "America/New_York") so 9:00 is 9 AM local. Default America/New_York. */
  timeZone?: string;
};

/** POST: sync L10 meeting to Outlook calendar. Creates or overwrites the team's L10 event. */
export async function POST(request: NextRequest) {
  const config = await getValidAccessToken();
  if (!config) {
    return NextResponse.json(
      { error: "Microsoft 365 not connected. Connect in Integrations first." },
      { status: 403 }
    );
  }

  let title: string;
  let schedule: MeetingSchedule | undefined;

  let timeZone: string | undefined;
  try {
    const body = (await request.json()) as RequestBody;
    title = body?.title ?? "";
    schedule = body?.schedule;
    timeZone = body?.timeZone;
  } catch {
    title = "";
    schedule = undefined;
  }

  if (!title || !schedule) {
    const db = getAdminDb();
    if (db) {
      const snap = await db
        .collection("companies")
        .doc(COMPANY_ID)
        .collection("teams")
        .doc(TEAM_ID)
        .collection("meetingTemplates")
        .limit(1)
        .get();
      const first = snap.docs[0];
      if (first) {
        const data = first.data();
        title = (data?.title as string) ?? "Weekly Leadership Meeting";
        schedule = data?.schedule as MeetingSchedule | undefined;
      }
    }
  }

  if (!title || !schedule) {
    return NextResponse.json(
      {
        error:
          "No meeting template found. Set title and schedule in the request body, or add a meeting template in Firestore.",
      },
      { status: 400 }
    );
  }

  try {
    const existingId = config.outlookEventId ?? null;
    if (existingId) {
      try {
        await deleteCalendarEvent(config.accessToken, existingId);
      } catch {
        // Event may already be deleted; continue to create new
      }
    }

    const result = await createCalendarEvent(config.accessToken, {
      title,
      schedule,
      durationMinutes: 60,
      timeZone,
    });

    await setMicrosoftOutlookEventId(result.id);

    return NextResponse.json({ ok: true, eventId: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync calendar";
    console.error("Microsoft sync-calendar error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
