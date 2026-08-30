"use server";

import { signOut } from "@/auth";
import { withBasePath } from "@/lib/base-path";

export async function signOutAction() {
  // Auth.js joins this to origin only — must include Next basePath (`/plantas/login`).
  await signOut({ redirectTo: withBasePath("/login") });
}
