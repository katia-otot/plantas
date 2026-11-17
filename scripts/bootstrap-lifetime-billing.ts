/**
 * Marca fundadores (y usuarios ya en DB con esos emails) como lifetime free.
 * Uso: npx tsx scripts/bootstrap-lifetime-billing.ts
 */
import { prisma } from "../lib/db";
import { LIFETIME_FREE_EMAILS } from "../lib/lifetime-emails";
import { normalizeEmail } from "../lib/owner-emails";

async function main() {
  const emails = LIFETIME_FREE_EMAILS.map((e) => normalizeEmail(e));
  console.log("Marcando lifetime free:", emails.join(", "));

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`- ${email}: aún no hay User (se marca al primer login)`);
      continue;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lifetimeFree: true,
        billingStatus: "lifetime",
        billingUpdatedAt: new Date(),
      },
    });
    console.log(`- ${email}: OK (id=${user.id})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
