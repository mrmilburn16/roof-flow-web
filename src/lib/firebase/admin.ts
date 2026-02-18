import type { Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firestore for API routes (e.g. Slack events writing todos).
 * Requires explicit credentials: FIREBASE_SERVICE_ACCOUNT_JSON (full JSON string, for Vercel)
 * or GOOGLE_APPLICATION_CREDENTIALS_JSON. Without one of these, we do not call the SDK
 * (avoids "Could not load the default credentials" when no ADC is available).
 */
export function getAdminDb(): Firestore | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (!projectId || !raw || raw.length < 100) return null;
  try {
    const admin = require("firebase-admin");
    if (admin.apps.length > 0) return admin.firestore();
    const credentials = JSON.parse(raw);
    if (!credentials?.private_key || !credentials?.client_email) return null;
    admin.initializeApp({ projectId, credential: admin.credential.cert(credentials) });
    return admin.firestore();
  } catch {
    return null;
  }
}
