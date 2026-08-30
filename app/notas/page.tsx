import { ActionIcon } from "@/components/ActionIcon";
import { GardenNoteForm } from "@/components/GardenNoteForm";
import { GardenNoteItem } from "@/components/GardenNoteItem";
import { listGardenNotes } from "@/lib/garden-notes";

export const dynamic = "force-dynamic";

export default async function GardenNotesPage() {
  const notes = await listGardenNotes();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Patio
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="notas" size={56} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">Notas del patio</h1>
        </div>
        <p className="mt-1 text-sm text-emerald-900/70">
          Anotaciones útiles: horarios, tips, datos del jardín.
        </p>
      </header>

      <GardenNoteForm />

      {notes.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
          <p className="font-semibold text-emerald-950">Todavía no hay notas</p>
          <p className="mt-1 text-sm text-emerald-900/70">
            Agregá la primera con el formulario de arriba.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-emerald-900/10 bg-white px-4 shadow-sm">
          {notes.map((note) => (
            <GardenNoteItem
              key={note.id}
              id={note.id}
              title={note.title}
              body={note.body}
            />
          ))}
        </section>
      )}
    </main>
  );
}
