import Link from "next/link";
import { ActionIcon } from "@/components/ActionIcon";
import { BirdCard } from "@/components/BirdCard";
import { listBirds } from "@/lib/birds";

export const dynamic = "force-dynamic";

export default async function BirdsPage() {
  const birds = await listBirds();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Patio
          </p>
          <div className="mt-1 flex items-center gap-3">
            <ActionIcon name="pajarito" size={48} alt="" />
            <h1 className="text-3xl font-bold text-emerald-950">Pájaros</h1>
          </div>
          <p className="mt-1 text-sm text-emerald-900/70">
            Los que aparecen por acá · {birds.length}
          </p>
        </div>
        <Link
          href="/pajaros/new"
          className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Nuevo
        </Link>
      </header>

      {birds.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <div className="flex justify-center">
            <ActionIcon name="pajarito" size={64} alt="" />
          </div>
          <p className="mt-3 text-lg font-semibold text-emerald-950">
            Todavía no hay pájaros
          </p>
          <Link
            href="/pajaros/new"
            className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Agregar el primero
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          {birds.map((bird) => (
            <BirdCard
              key={bird.id}
              id={bird.id}
              name={bird.name}
              notes={bird.notes}
              coverPhotoPath={bird.coverPhotoPath}
            />
          ))}
        </section>
      )}
    </main>
  );
}
