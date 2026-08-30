import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionIcon } from "@/components/ActionIcon";
import { BirdForm } from "@/components/BirdForm";
import { getBirdById } from "@/lib/birds";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBirdPage({ params }: PageProps) {
  const { id } = await params;
  const bird = await getBirdById(id);
  if (!bird) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ActionIcon name="pajarito" size={44} alt="" />
          <h1 className="text-2xl font-bold text-emerald-950">Editar</h1>
        </div>
        <Link
          href={`/pajaros/${bird.id}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          Cancelar
        </Link>
      </header>
      <BirdForm
        mode="edit"
        birdId={bird.id}
        initialName={bird.name}
        initialNotes={bird.notes}
        initialCoverPhotoPath={bird.coverPhotoPath}
      />
    </main>
  );
}
