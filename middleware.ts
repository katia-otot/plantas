import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Protect app pages and APIs; skip static assets.
     * Include explicit "/" — with basePath, home is `/plantas` externally but
     * middleware sees "/" and the catch-all below does not match it.
     */
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
