import webpush from "web-push";
import { prisma } from "@/lib/db";
import { isFcmConfigured, sendFcmToAllTokens } from "@/lib/fcm";
import {
  buildTodayNotificationCopy,
  getTodayTaskSummaries,
} from "@/lib/today-tasks";
import { ensureDefaultGarden, resolveGardenId } from "@/lib/garden-access";
import { auth } from "@/auth";

export type SerializedPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:plantas@localhost";

  if (!publicKey || !privateKey) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY");
  }

  return { publicKey, privateKey, subject };
}

export function configureWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function savePushSubscription(
  subscription: SerializedPushSubscription,
  userAgent?: string | null,
) {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error("Suscripción inválida");
  }

  const session = await auth();
  const userId: string | null = session?.user?.id ?? null;
  let gardenId: string | null = null;
  try {
    gardenId = await resolveGardenId();
  } catch {
    gardenId = (await ensureDefaultGarden()).id;
  }

  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 300) || null,
      userId,
      gardenId,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent?.slice(0, 300) || null,
      userId: userId ?? undefined,
      gardenId: gardenId ?? undefined,
    },
  });
}

export async function removePushSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushToSubscription(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: { title: string; body: string; url?: string },
) {
  configureWebPush();
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}

export async function notifyTodayTasks(options?: {
  forceEmpty?: boolean;
}): Promise<{
  taskCount: number;
  sent: number;
  failed: number;
  skipped: boolean;
  title?: string;
  body?: string;
}> {
  // Cron / notify: use shared patio so owners keep receiving alerts.
  const shared = await ensureDefaultGarden();
  const tasks = await getTodayTaskSummaries(undefined, undefined, shared.id);
  const copy = buildTodayNotificationCopy(tasks);

  if (!copy) {
    if (!options?.forceEmpty) {
      return { taskCount: 0, sent: 0, failed: 0, skipped: true };
    }
  }

  const payload = copy ?? {
    title: "Hoy en el patio",
    body: "Todo al día · no hay pendientes",
  };

  let sent = 0;
  let failed = 0;

  if (isFcmConfigured()) {
    const fcm = await sendFcmToAllTokens({
      title: payload.title,
      body: payload.body,
      url: process.env.PLANTAS_PUBLIC_URL || "http://149.50.156.136/plantas",
    });
    sent += fcm.sent;
    failed += fcm.failed;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      OR: [{ gardenId: shared.id }, { gardenId: null }],
    },
  });
  if (subscriptions.length > 0) {
    try {
      configureWebPush();
    } catch (error) {
      console.error("Web Push VAPID no configurado", error);
    }

    for (const subscription of subscriptions) {
      try {
        await sendPushToSubscription(subscription, {
          title: payload.title,
          body: payload.body,
          url: "/",
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
        } else {
          console.error("Push failed", subscription.endpoint, error);
        }
      }
    }
  }

  return {
    taskCount: tasks.length,
    sent,
    failed,
    skipped: false,
    title: payload.title,
    body: payload.body,
  };
}
