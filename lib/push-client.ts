export const FCM_ACTIVATED_FLAG = "plantasFcmActivated";

export type PushSupportState = "checking" | "ok" | "insecure" | "unsupported";

type FcmLocation = Pick<Location, "search" | "pathname" | "hash">;
type FcmHistory = Pick<History, "replaceState">;
type FcmStorage = Pick<Storage, "getItem" | "setItem">;

export function readFcmActivatedFromLocation(
  storage: FcmStorage,
  location: FcmLocation,
  history: FcmHistory,
): boolean {
  const params = new URLSearchParams(location.search);
  if (params.get("avisos") === "ok") {
    storage.setItem(FCM_ACTIVATED_FLAG, "1");
    params.delete("avisos");
    const next = `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`;
    history.replaceState({}, "", next);
    return true;
  }

  return storage.getItem(FCM_ACTIVATED_FLAG) === "1";
}

export function detectPushSupportFromWindow(
  win: Window | undefined,
): PushSupportState {
  if (!win) {
    return "checking";
  }
  if (!win.isSecureContext) {
    return "insecure";
  }
  if (
    !(
      "serviceWorker" in win.navigator &&
      "PushManager" in win &&
      "Notification" in win
    )
  ) {
    return "unsupported";
  }
  return "ok";
}

export function readFcmActivated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return readFcmActivatedFromLocation(
    localStorage,
    window.location,
    window.history,
  );
}

export function detectPushSupport(): PushSupportState {
  if (typeof window === "undefined") {
    return "checking";
  }
  return detectPushSupportFromWindow(window);
}
