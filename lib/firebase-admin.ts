import { readFileSync, existsSync } from "fs";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function loadServiceAccount(): Record<string, unknown> | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline?.trim()) {
    return JSON.parse(inline) as Record<string, unknown>;
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path && existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(loadServiceAccount());
}

export function getFirebaseAdminApp(): App | null {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    return null;
  }

  return initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  });
}

export async function verifyFirebaseIdToken(idToken: string) {
  const app = getFirebaseAdminApp();
  if (!app) {
    throw new Error("Firebase Admin no está configurado");
  }

  return getAuth(app).verifyIdToken(idToken);
}
