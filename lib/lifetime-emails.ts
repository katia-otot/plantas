import { normalizeEmail } from "@/lib/owner-emails";

/** Fundadores: nunca pagan (Katia + novio). */
export const LIFETIME_FREE_EMAILS = [
  "katiagadea19@gmail.com",
  "nechegoyen90529@gmail.com",
] as const;

/**
 * Cupo orientativo de early lifetime (marcar a mano en DB / script).
 * Solo los emails de LIFETIME_FREE_EMAILS se auto-marcan al login.
 */
export const MAX_LIFETIME_FREE_USERS = 5;

export function isLifetimeFreeEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const normalized = normalizeEmail(email);
  return (LIFETIME_FREE_EMAILS as readonly string[]).includes(normalized);
}
