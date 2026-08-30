import type { NextAuthConfig } from "next-auth";
import {
  authApiBasePath,
  getBasePath,
  resolveAuthRedirect,
  withBasePath,
} from "@/lib/base-path";

/**
 * Edge-safe auth options (no Prisma / firebase-admin). Used by middleware.
 * Full providers live in auth.ts (Node runtime).
 *
 * Auth locks the app when AUTH_SECRET is set and FIREBASE_AUTH_REQUIRED=1
 * (or when FIREBASE_SERVICE_ACCOUNT_* is present — see isAuthEnforced).
 *
 * Any Google account with a verified email can sign in; patio assignment
 * (shared owners vs personal empty garden) happens in ensureGardenAccess.
 */
function isAuthEnforced(): boolean {
  if (process.env.FIREBASE_AUTH_REQUIRED === "0") {
    return false;
  }
  if (process.env.FIREBASE_AUTH_REQUIRED === "1") {
    return true;
  }
  // Auto-enforce once a service account is available on the server.
  // Edge middleware may not see the file path; prefer explicit FIREBASE_AUTH_REQUIRED=1 on VPS.
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim(),
  );
}

const loginPath = withBasePath("/login");

export const authConfig = {
  // Keep `/api/auth` (Next strips `/plantas` before the route handler). Setting this
  // explicitly also stops AUTH_URL=`…/plantas` from stealing Auth's basePath.
  basePath: authApiBasePath(),
  // Providers that need Node (Credentials + Firebase verify) are added in auth.ts.
  providers: [],
  pages: {
    // Middleware sets Location pathname on the public URL — include Next basePath.
    signIn: loginPath,
    error: loginPath,
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email);
    },
    async redirect({ url, baseUrl }) {
      return resolveAuthRedirect(url, baseUrl);
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (user?.email) {
        token.email = user.email;
      }
      if (user?.name) {
        token.name = user.name;
      }
      if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const basePath = getBasePath();
      const path =
        basePath && pathname.startsWith(basePath)
          ? pathname.slice(basePath.length) || "/"
          : pathname;

      if (
        path.startsWith("/login") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/push/notify-today") ||
        path === "/sw.js" ||
        path.startsWith("/icons/") ||
        path.startsWith("/maps/") ||
        path === "/manifest.webmanifest" ||
        path === "/icon.png" ||
        path === "/apple-icon.png" ||
        path === "/badge.png"
      ) {
        return true;
      }

      // Until Firebase Admin + AUTH_SECRET are ready, keep the patio usable.
      if (!isAuthEnforced()) {
        return true;
      }

      return !!auth?.user;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
