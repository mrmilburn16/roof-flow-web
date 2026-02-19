/**
 * Microsoft Graph API helpers. Use getValidAccessToken() from config before calling.
 */

import type { MeetingSchedule } from "@/lib/domain";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** Call Microsoft Graph API. */
export async function graphRequest<T = unknown>(
  accessToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || res.statusText || `Graph API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Parse time string "HH:mm" or "H:mm" to hours and minutes (0-23, 0-59). Default 9:00. */
function parseTime(time: string): { hours: number; minutes: number } {
  const parts = String(time ?? "").trim().split(":");
  const hours = Math.min(23, Math.max(0, Number(parts[0]) || 9));
  const minutes = Math.min(59, Math.max(0, Number(parts[1]) || 0));
  return { hours, minutes };
}

/** Get the next occurrence of dayOfWeek at the given time (UTC). */
function getNextStartDate(dayOfWeek: number, time: string): { date: string; dateTime: string } {
  const { hours: h, minutes: m } = parseTime(time);
  const dow = Math.min(6, Math.max(0, Number(dayOfWeek) || 2));
  const now = new Date();
  const currentDay = now.getUTCDay();
  let daysUntil = dow - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    if (now.getUTCHours() > h || (now.getUTCHours() === h && now.getUTCMinutes() >= m)) {
      daysUntil = 7;
    }
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntil, h, m, 0, 0));
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date computed for recurring meeting");
  const date = start.toISOString().slice(0, 10);
  const dateTime = start.toISOString().slice(0, 19);
  return { date, dateTime };
}

/** Default 1 hour duration for calendar event. */
function getEndDateTime(dateTime: string, durationMinutes = 60): string {
  const iso = String(dateTime).trim().endsWith("Z") ? dateTime : dateTime + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid start time for calendar event");
  d.setUTCMinutes(d.getUTCMinutes() + durationMinutes);
  return d.toISOString().slice(0, 19);
}

export type CreateEventParams = {
  title: string;
  schedule: MeetingSchedule;
  /** Default 60. */
  durationMinutes?: number;
  /** IANA timezone for start/end (e.g. "America/New_York"). Default America/New_York so 9:00 is 9 AM local. */
  timeZone?: string;
};

export type CreateEventResult = { id: string };

/** Build end dateTime string in same timezone (date YYYY-MM-DD, start h/m, durationMinutes). */
function getEndDateTimeLocal(date: string, startH: number, startM: number, durationMinutes: number): string {
  const totalM = startH * 60 + startM + durationMinutes;
  const endDayOffset = Math.floor(totalM / (24 * 60));
  const endMInDay = ((totalM % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(endMInDay / 60);
  const endMin = endMInDay % 60;
  if (endDayOffset !== 0) {
    const d = new Date(date + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + endDayOffset);
    const endDate = d.toISOString().slice(0, 10);
    return `${endDate}T${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;
  }
  return `${date}T${String(endH).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;
}

/**
 * Create an Outlook calendar event from an EOS meeting template schedule.
 * Uses the given timeZone so e.g. 9:00 is 9 AM in that zone (not UTC).
 */
export async function createCalendarEvent(
  accessToken: string,
  params: CreateEventParams
): Promise<CreateEventResult> {
  const { title, schedule, durationMinutes = 60, timeZone = "America/New_York" } = params;
  const tz = timeZone && timeZone.trim() ? timeZone.trim() : "America/New_York";

  if (schedule.type === "oneTime") {
    const date = String(schedule.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid one-time meeting date");
    const { hours: h, minutes: m } = parseTime(schedule.time ?? "09:00");
    const startDateTime = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
    const endDateTime = getEndDateTimeLocal(date, h, m, durationMinutes);
    const body = {
      subject: title,
      start: { dateTime: startDateTime, timeZone: tz },
      end: { dateTime: endDateTime, timeZone: tz },
      body: { contentType: "text", content: "L10 meeting from Roof Flow." },
    };
    const event = (await graphRequest<{ id: string }>(
      accessToken,
      "POST",
      "/me/calendar/events",
      body
    )) as CreateEventResult;
    return event;
  }

  const { dayOfWeek, time, frequency } = schedule;
  const dayIndex = Math.min(6, Math.max(0, Number(dayOfWeek) ?? 2));
  const { date } = getNextStartDate(dayIndex, String(time ?? "09:00"));
  const { hours: h, minutes: m } = parseTime(String(time ?? "09:00"));
  const startDateTime = `${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  const endDateTime = getEndDateTimeLocal(date, h, m, durationMinutes);
  const dayName = DAY_NAMES[dayIndex];
  const body = {
    subject: title,
    start: { dateTime: startDateTime, timeZone: tz },
    end: { dateTime: endDateTime, timeZone: tz },
    body: { contentType: "text", content: "Weekly L10 meeting from Roof Flow." },
    recurrence: {
      pattern: {
        type: "weekly",
        interval: frequency === "biweekly" ? 2 : 1,
        daysOfWeek: [dayName.charAt(0).toUpperCase() + dayName.slice(1)],
      },
      range: {
        type: "noEnd",
        startDate: date,
      },
    },
  };
  const event = (await graphRequest<{ id: string }>(
    accessToken,
    "POST",
    "/me/calendar/events",
    body
  )) as CreateEventResult;
  return event;
}

/**
 * Update an existing Outlook calendar event (e.g. when template title or schedule changes).
 * Pass the event id from config.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<void> {
  if (!eventId) return;
  const body: Record<string, unknown> = {};
  if (params.title) body.subject = params.title;
  if (Object.keys(body).length === 0) return;
  await graphRequest(accessToken, "PATCH", `/me/events/${eventId}`, body);
}

/**
 * Delete an Outlook calendar event.
 */
export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  if (!eventId) return;
  await graphRequest(accessToken, "DELETE", `/me/events/${eventId}`);
}
