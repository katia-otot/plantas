import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { upsertUserFromFirebaseToken } from "@/lib/firebase-user";
import { ensureGardenAccess } from "@/lib/garden-access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (!idToken || typeof idToken !== "string") {
          return null;
        }

        try {
          const decoded = await verifyFirebaseIdToken(idToken);
          if (!decoded.email) {
            return null;
          }
          return upsertUserFromFirebaseToken(decoded);
        } catch (error) {
          console.error("Firebase ID token verify failed", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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

      // Backfill profile for sessions created before name/image were stored.
      if (
        token.sub &&
        (typeof token.name !== "string" || typeof token.picture !== "string")
      ) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { name: true, image: true, email: true },
        });
        if (dbUser) {
          if (typeof token.name !== "string" && dbUser.name) {
            token.name = dbUser.name;
          }
          if (typeof token.picture !== "string" && dbUser.image) {
            token.picture = dbUser.image;
          }
          if (typeof token.email !== "string" && dbUser.email) {
            token.email = dbUser.email;
          }
        }
      }

      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id && user.email) {
        await ensureGardenAccess(user.id, user.email);
      }
    },
  },
});
