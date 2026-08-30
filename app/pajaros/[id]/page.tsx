import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionIcon } from "@/components/ActionIcon";
import { CoverPhotoEditor } from "@/components/CoverPhotoEditor";
import { getBirdById } from "@/lib/birds";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BirdDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bird = await getBirdById(id);
  if (!bird) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <CoverPhotoEditor
        name={bird.name}
        coverPhotoPath={bird.coverPhotoPath}
        savePath={`/api/birds/${bird.id}/cover`}
        emptyFallback={<ActionIcon name="pajarito" size={96} alt="" />}
      />

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-emerald-950">{bird.name}</h1>
          {bird.notes ? (
            <p className="mt-2 whitespace-pre-wrap text-emerald-900/80">
              {bird.notes}
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-900/50">Sin descripción</p>
          )}
        </div>
        <Link
          href={`/pajaros/${bird.id}/edit`}
          className="rounded-xl border border-emerald-900/15 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          Editar
        </Link>
      </header>

      <Link
        href="/pajaros"
        className="text-sm font-semibold text-emerald-800 hover:underline"
      >
        ← Volver a pájaros
      </Link>
    </main>
  );
}
