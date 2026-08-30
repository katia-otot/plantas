const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Next.js mount path (e.g. `/plantas`) or empty when served at host root. */
export function getBasePath(): string {
  return basePath;
}

/**
 * Auth.js route prefix as seen by the App Router handler.
 * Next.js strips `NEXT_PUBLIC_BASE_PATH` before routing, so this stays `/api/auth`
 * even when the public URL is `/plantas/api/auth`.
 */
export function authApiBasePath(): string {
  return "/api/auth";
}

/** Prefix app-relative paths for fetch/img when the app is mounted under a basePath. */
export function withBasePath(path: string | null | undefined): string {
  if (!path) {
    return basePath || "/";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!basePath) {
    return normalized;
  }

  if (normalized === basePath || normalized.startsWith(`${basePath}/`)) {
    return normalized;
  }

  return `${basePath}${normalized}`;
}

/**
 * Auth.js `redirect` callback: never send users to bare host `/` when the app
 * lives under a basePath. `baseUrl` from Auth.js is origin-only.
 */
export function resolveAuthRedirect(url: string, baseUrl: string): string {
  const appHome = basePath ? `${baseUrl}${basePath}` : `${baseUrl}/`;

  if (url.startsWith("/")) {
    if (!basePath) {
      return `${baseUrl}${url}`;
    }
    if (url === basePath || url.startsWith(`${basePath}/`)) {
      return `${baseUrl}${url}`;
    }
    if (url === "/") {
      return appHome;
    }
    return `${baseUrl}${basePath}${url}`;
  }

  try {
    const target = new URL(url);
    if (target.origin !== baseUrl) {
      return appHome;
    }
    if (!basePath) {
      return url;
    }
    const path = target.pathname || "/";
    if (path === "/" || path === "") {
      return appHome;
    }
    if (path === basePath || path.startsWith(`${basePath}/`)) {
      return url;
    }
    // Same host but outside the app (e.g. PixelWeb at `/`) → force Anthos home.
    return appHome;
  } catch {
    return appHome;
  }
}
