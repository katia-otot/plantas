"use client";

import { signOutAction } from "@/app/logout/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
