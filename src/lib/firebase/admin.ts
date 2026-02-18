import type { Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firestore for API routes (e.g. Slack events writing todos).
 * Requires firebase-admin and GOOGLE_APPLICATION_CREDENTIALS or default credentials.
 */
export function getAdminDb(): Firestore | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) return null;
  try {
    const admin = require("firebase-admin");
    if (admin.apps.length > 0) return admin.firestore();
    admin.initializeApp({ projectId });
    return admin.firestore();
  } catch {
    return null;
  }
}
