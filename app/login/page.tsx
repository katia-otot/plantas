import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FirebaseGoogleSignInButton } from "@/components/FirebaseGoogleSignInButton";
import { ensureDefaultGarden } from "@/lib/garden-access";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  await ensureDefaultGarden();
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Anthos
        </p>
        <h1 className="mt-2 text-3xl font-bold text-emerald-950">
          Iniciar sesión
        </h1>
      </header>

      <FirebaseGoogleSignInButton initialError={params.error ?? null} />
    </main>
  );
}
