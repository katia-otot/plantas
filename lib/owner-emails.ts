const DEFAULT_OWNER_EMAILS = [
  "nechegoyen90529@gmail.com",
  "katiagadea19@gmail.com",
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Emails authorized to own/share the default patio. Edge-safe (no Prisma). */
export function getOwnerEmails(): string[] {
  const fromEnv = process.env.AUTH_OWNER_EMAILS?.split(",") ?? [];
  const emails = [...fromEnv, ...DEFAULT_OWNER_EMAILS]
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
  return [...new Set(emails)];
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return getOwnerEmails().includes(normalizeEmail(email));
}
