const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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
