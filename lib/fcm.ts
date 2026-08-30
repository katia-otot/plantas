import { createHash } from "crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  getFirebaseAdminApp,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-admin";

const PLANTAS_URL =
  process.env.PLANTAS_PUBLIC_URL || "http://149.50.156.136/plantas";

export function isFcmConfigured() {
  return isFirebaseAdminConfigured();
}

export async function listFcmTokens(): Promise<string[]> {
  const app = getFirebaseAdminApp();
  if (!app) {
    return [];
  }

  const snap = await getFirestore(app).collection("fcmTokens").get();
  const tokens: string[] = [];
  for (const doc of snap.docs) {
    const token = doc.data().token;
    if (typeof token === "string" && token.length > 20) {
      tokens.push(token);
    }
  }
  return tokens;
}

export async function deleteFcmTokenDoc(token: string) {
  const app = getFirebaseAdminApp();
  if (!app) {
    return;
  }

  const id = createHash("sha256").update(token).digest("hex").slice(0, 40);
  await getFirestore(app).collection("fcmTokens").doc(id).delete();
}

export async function sendFcmToAllTokens(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ sent: number; failed: number }> {
  const app = getFirebaseAdminApp();
  if (!app) {
    return { sent: 0, failed: 0 };
  }

  const tokens = await listFcmTokens();
  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messaging = getMessaging(app);
  const url = payload.url || PLANTAS_URL;
  let sent = 0;
  let failed = 0;

  // FCM multicast max 500
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch,
      // Data-only: Chrome won't auto-show a second notification.
      // The service worker shows the single one with the plant icon.
      data: {
        title: payload.title,
        body: payload.body,
        url,
      },
      webpush: {
        fcmOptions: {
          link: url,
        },
        headers: {
          Urgency: "high",
        },
      },
    });

    sent += result.successCount;
    failed += result.failureCount;

    result.responses.forEach((response, index) => {
      if (response.success) {
        return;
      }
      const code = response.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        void deleteFcmTokenDoc(batch[index]!);
      } else {
        console.error("FCM failed", code, response.error?.message);
      }
    });
  }

  return { sent, failed };
}
