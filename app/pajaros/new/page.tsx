import Link from "next/link";
import { ActionIcon } from "@/components/ActionIcon";
import { BirdForm } from "@/components/BirdForm";

export const dynamic = "force-dynamic";

export default function NewBirdPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ActionIcon name="pajarito" size={44} alt="" />
          <h1 className="text-2xl font-bold text-emerald-950">Nuevo pájaro</h1>
        </div>
        <Link
          href="/pajaros"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          Volver
        </Link>
      </header>
      <BirdForm mode="create" />
    </main>
  );
}
