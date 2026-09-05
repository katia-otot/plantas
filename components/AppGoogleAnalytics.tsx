"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { withBasePath } from "@/lib/base-path";

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId || !pathname) {
      return;
    }

    const query = searchParams?.toString();
    const pagePath = `${withBasePath(pathname)}${query ? `?${query}` : ""}`;

    window.gtag?.("config", gaId, { page_path: pagePath });
  }, [pathname, searchParams]);

  return null;
}

/** Loads GA4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; tracks client navigations. */
export function AppGoogleAnalytics() {
  if (!gaId) {
    return null;
  }

  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}
