/**
 * Pone una cuenta en prueba de 14 días (no lifetime).
 * Uso: npx tsx scripts/set-user-trial.ts email@gmail.com
 */
import { prisma } from "../lib/db";
import { getTrialDays } from "../lib/billing";
import { normalizeEmail } from "../lib/owner-emails";

async function main() {
  const raw = process.argv[2];
  if (!raw) {
    throw new Error("Pasá el email: npx tsx scripts/set-user-trial.ts user@gmail.com");
  }
  const email = normalizeEmail(raw);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No hay User con email ${email}`);
  }

  const trialEndsAt = new Date(
    Date.now() + getTrialDays() * 24 * 60 * 60 * 1000,
  );

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      lifetimeFree: false,
      billingStatus: "trial",
      trialEndsAt,
      paidUntil: null,
      billingUpdatedAt: new Date(),
    },
  });

  console.log({
    email: updated.email,
    lifetimeFree: updated.lifetimeFree,
    billingStatus: updated.billingStatus,
    trialEndsAt: updated.trialEndsAt?.toISOString(),
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
