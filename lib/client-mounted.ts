/** useSyncExternalStore helpers for client-only UI (e.g. portals). */
export function subscribeClientMounted() {
  return () => {};
}

export function getClientMountedSnapshot() {
  return true;
}

export function getServerMountedSnapshot() {
  return false;
}

export function shouldRenderClientPortal(open: boolean, mounted: boolean) {
  return open && mounted;
}
