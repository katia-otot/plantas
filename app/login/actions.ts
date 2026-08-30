"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { withBasePath } from "@/lib/base-path";

/**
 * Exchange a verified Firebase ID token for an Auth.js session cookie.
 */
export async function firebaseSignInAction(idToken: string) {
  if (!idToken?.trim()) {
    return { ok: false as const, error: "missing_token" };
  }

  try {
    await signIn("firebase", {
      idToken: idToken.trim(),
      // Auth.js joins this to origin only — must include Next basePath (`/plantas`).
      redirectTo: withBasePath("/"),
    });
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false as const, error: error.type };
    }
    // Next.js redirect() throws; rethrow so navigation works.
    throw error;
  }
}
