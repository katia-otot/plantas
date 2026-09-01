"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { formatScheduleLabel } from "@/lib/notification-schedule";

import {
  FCM_ACTIVATED_FLAG,
  detectPushSupport,
  readFcmActivated,
  type PushSupportState,
} from "@/lib/push-client";

type ScheduleState = {
  weekdayTime: string;
  weekendTime: string;
};

function NotificationScheduleSettings() {
  const [schedule, setSchedule] = useState<ScheduleState>({
    weekdayTime: "15:00",
    weekendTime: "10:30",
  });
  const [draft, setDraft] = useState<ScheduleState>(schedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          withBasePath("/api/settings/notification-schedule"),
        );
        if (!response.ok) {
          throw new Error("No se pudo leer el horario");
        }
        const payload = (await response.json()) as ScheduleState;
        setSchedule(payload);
        setDraft(payload);
      } catch (error) {
        console.error(error);
        setScheduleMessage("No se pudo cargar el horario de avisos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty =
    draft.weekdayTime !== schedule.weekdayTime ||
    draft.weekendTime !== schedule.weekendTime;

  async function saveSchedule() {
    try {
      setSaving(true);
      setScheduleMessage(null);
      const response = await fetch(
        withBasePath("/api/settings/notification-schedule"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const payload = (await response.json()) as ScheduleState & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar");
      }
      setSchedule(payload);
      setDraft(payload);
      setScheduleMessage("Horario guardado.");
    } catch (error) {
      console.error(error);
      setScheduleMessage(
        error instanceof Error ? error.message : "No se pudo guardar el horario",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-emerald-900/70">Cargando horario de avisos…</p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3">
      <div>
        <p className="text-sm font-semibold text-emerald-950">Horario de avisos</p>
        <p className="mt-1 text-xs text-emerald-900/70">
          {formatScheduleLabel(schedule)}. Aplica a todos los celulares del patio.
        </p>
      </div>

      <label className="block text-sm text-emerald-950">
        <span className="mb-1 block font-medium">Lunes a viernes</span>
        <input
          type="time"
          value={draft.weekdayTime}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              weekdayTime: event.target.value,
            }))
          }
          className="w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm text-emerald-950">
        <span className="mb-1 block font-medium">Sábado y domingo</span>
        <input
          type="time"
          value={draft.weekendTime}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              weekendTime: event.target.value,
            }))
          }
          className="w-full rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm"
        />
      </label>

      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => void saveSchedule()}
        className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar horario"}
      </button>

      {scheduleMessage ? (
        <p className="text-sm text-emerald-900/80">{scheduleMessage}</p>
      ) : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationsPanel() {
  const [support] = useState<PushSupportState>(() => detectPushSupport());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window === "undefined" ? "default" : Notification.permission,
  );
  const [subscribed, setSubscribed] = useState(false);
  const [fcmActivated, setFcmActivated] = useState(() => readFcmActivated());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (support !== "ok") {
      return;
    }

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          withBasePath("/sw.js"),
          {
            scope: withBasePath("/"),
            updateViaCache: "none",
          },
        );
        await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
      } catch (error) {
        console.error(error);
        setMessage("No se pudo registrar el service worker");
      }
    })();
  }, [support]);

  async function enable() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setMessage("Falta la clave pública VAPID en el servidor");
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setMessage("Permiso denegado. Activá notificaciones en el navegador.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const response = await fetch(withBasePath("/api/push/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar la suscripción");
      }

      setSubscribed(true);
      setMessage("Listo. Vas a recibir avisos de Hoy en este celular.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron activar las notificaciones",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    try {
      setBusy(true);
      setMessage(null);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(withBasePath("/api/push/subscribe"), {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notificaciones desactivadas en este celular.");
    } catch (error) {
      console.error(error);
      setMessage("No se pudieron desactivar");
    } finally {
      setBusy(false);
    }
  }

  function markFcmActivated() {
    localStorage.setItem(FCM_ACTIVATED_FLAG, "1");
    setFcmActivated(true);
    setMessage("Listo. Este celular queda marcado como con avisos activos.");
  }

  function clearFcmActivated() {
    localStorage.removeItem(FCM_ACTIVATED_FLAG);
    setFcmActivated(false);
    setMessage(
      "Se ocultó el estado en este celular. Los avisos pueden seguir llegando hasta que los desactives en la página de Firebase.",
    );
  }

  async function sendTest() {
    try {
      setBusy(true);
      setMessage(null);
      const response = await fetch(withBasePath("/api/push/test"), {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        skipped?: boolean;
        sent?: number;
        title?: string;
        body?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Falló el envío");
      }
      setMessage(
        `Enviado a ${payload.sent ?? 0} celular(es): ${payload.title} — ${payload.body}`,
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "No se pudo enviar la prueba",
      );
    } finally {
      setBusy(false);
    }
  }

  if (support === "checking") {
    return (
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-emerald-950">Notificaciones</h3>
        <p className="mt-2 text-sm text-emerald-900/70">Revisando soporte…</p>
      </section>
    );
  }

  if (support === "insecure") {
    const activateUrl = process.env.NEXT_PUBLIC_FCM_ACTIVATE_URL;
    return (
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-emerald-950">Notificaciones Hoy</h3>
        <p className="mt-2 text-sm text-emerald-900/70">
          Los avisos se activan por celular en una página segura. Al tocarlos se
          abre Anthos.
        </p>

        <div className="mt-3 space-y-3">
          <NotificationScheduleSettings />
          {fcmActivated ? (
            <>
              <p className="text-sm font-medium text-emerald-800">
                Activadas en este celular
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendTest()}
                className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
              >
                {busy ? "..." : "Enviar aviso de prueba"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearFcmActivated}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                Ya no mostrar como activado
              </button>
            </>
          ) : (
            <>
              {activateUrl ? (
                <a
                  href={activateUrl}
                  className="block w-full rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Activar avisos en este celular
                </a>
              ) : (
                <p className="text-sm text-amber-800">
                  Falta la página de avisos en Firebase.
                </p>
              )}
              <button
                type="button"
                onClick={markFcmActivated}
                className="w-full rounded-xl px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
              >
                Ya activé avisos en este celular
              </button>
            </>
          )}
        </div>

        {message ? (
          <p className="mt-3 text-sm text-emerald-900/80">{message}</p>
        ) : null}
      </section>
    );
  }

  if (support === "unsupported") {
    return (
      <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-emerald-950">Notificaciones</h3>
        <p className="mt-2 text-sm text-emerald-900/70">
          Este navegador no soporta Web Push. En Android abrí la app en Chrome
          (no en el navegador de Instagram/WhatsApp).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-emerald-950">Notificaciones Hoy</h3>
      <p className="mt-1 text-sm text-emerald-900/70">
        Avisos de riegos y cuidados pendientes (solo plantas en Alta).
      </p>

      <div className="mt-3 space-y-3">
        <NotificationScheduleSettings />

        <div className="space-y-2">
        {!subscribed ? (
          <button
            type="button"
            disabled={busy || permission === "denied"}
            onClick={() => void enable()}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? "..." : "Activar en este celular"}
          </button>
        ) : (
          <>
            <p className="text-sm font-medium text-emerald-800">
              Activadas en este celular
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendTest()}
              className="w-full rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
            >
              Enviar aviso de prueba
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void disable()}
              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              Desactivar
            </button>
          </>
        )}
        </div>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-emerald-900/80">{message}</p>
      ) : null}
    </section>
  );
}
