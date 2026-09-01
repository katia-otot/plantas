import { prisma } from "./db";
import { assertNoteInGarden, resolveGardenId } from "./garden-access";

export const GARDEN_NOTE_CATEGORIES = ["tip", "tarea", "pendiente"] as const;
export type GardenNoteCategory = (typeof GARDEN_NOTE_CATEGORIES)[number];

export type GardenNoteInput = {
  title: string;
  body?: string | null;
  category?: GardenNoteCategory | string | null;
  done?: boolean;
};

export type GardenNoteShapeContext = {
  section: string | null;
  topic: string | null;
};

export type ShapedGardenNote = {
  title: string;
  body: string | null;
  category: GardenNoteCategory;
};

const SECTION_HEADERS = new Set([
  "plagas",
  "suelo",
  "fertilizacion",
  "cover crops",
  "micorrizas",
  "humus por todas partes",
  "plantas de interior chicas y poca luz",
]);

/** Labels that are not real subjects — keep previous topic instead. */
const GENERIC_COLON_LABELS = new Set([
  "opcion",
  "otro metodo",
  "falta",
  "falta ver este",
]);

/**
 * Fragments that continue a previous tip (subject lives on an earlier row).
 */
const CONTINUATION_RE =
  /^(almacenar|tambien|también|y\s|se puede|tiene que|en general|opcion:|opción:|otro metodo|otro método|falta\b)/i;

function normalizeNoteKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function joinNoteParts(
  values: Array<string | null | undefined>,
): string | null {
  const unique: string[] = [];
  for (const value of values) {
    const part = value?.trim();
    if (!part || unique.includes(part)) continue;
    unique.push(part);
  }
  return unique.length > 0 ? unique.join("\n") : null;
}

function splitColonLabel(text: string): { label: string; rest: string } | null {
  const colonIndex = text.indexOf(":");
  if (colonIndex <= 0 || colonIndex > 48) return null;
  const label = text.slice(0, colonIndex).trim();
  const rest = text.slice(colonIndex + 1).trim();
  if (!label || !rest) return null;
  // Avoid splitting URLs or times like "9-12".
  if (/^https?/i.test(label) || /^\d/.test(label)) return null;
  return { label, rest };
}

/**
 * Detect garden tips / todos / section headers that were stored as plant names.
 * Shared by Excel import skip rules and local DB cleanup.
 */
export function isGardenNoteText(name: string): boolean {
  const text = name.trim();
  if (!text) {
    return false;
  }

  if (/^https?:\/\//i.test(text)) {
    return true;
  }

  const normalized = normalizeNoteKey(text);

  if (SECTION_HEADERS.has(normalized)) {
    return true;
  }

  // Imperatives, tip labels, nursery hours, recipe-style notes.
  if (
    /^(almacenar|arreglar|averiguar|buscar|cebo\b|comprar|falta\b|opcion\b|opción\b|otro metodo|otro método|se puede|tiene que|tambien\b|también\b|en general|y perlita|hummus\b|humus\b|guano\b|tierra de diatomeas|fecha\b|horarios\b|vivero\b|el remanso|grosor del|compactacion|compactación|bieldo|gorgojos)\b/i.test(
      normalized,
    )
  ) {
    return true;
  }

  // Colon labels can't use \b after ":" (colon is already a non-word char).
  if (/^(heladas:|mulch:|compost:)/i.test(normalized)) {
    return true;
  }

  // Long free-form sentences are almost never plant names.
  if (text.length > 80) {
    return true;
  }

  return false;
}

/** Notes/tips by default — not a todo list. */
export function inferGardenNoteCategory(): GardenNoteCategory {
  return "tip";
}

/**
 * Build a readable title + body using section / previous-topic context from
 * surrounding Excel rows (e.g. "Almacenar…" → Hummus líquido).
 */
export function shapeGardenNote(
  rawName: string,
  extras: string | null,
  ctx: GardenNoteShapeContext,
): { note: ShapedGardenNote; ctx: GardenNoteShapeContext } {
  const name = rawName.trim();
  const category = inferGardenNoteCategory();
  const normalized = normalizeNoteKey(name);
  let section = ctx.section;
  let topic = ctx.topic;

  if (SECTION_HEADERS.has(normalized)) {
    const title = name.replace(/\s+/g, " ").trim();
    section = title;
    topic = title;
    return {
      note: {
        title,
        body: extras,
        category,
      },
      ctx: { section, topic },
    };
  }

  if (/^https?:\/\//i.test(name)) {
    const referent = topic || section;
    const title = referent ? `Enlace — ${referent}` : "Enlace";
    return {
      note: {
        title,
        body: joinNoteParts([name, extras]),
        category,
      },
      ctx: { section, topic },
    };
  }

  const colon = splitColonLabel(name);
  if (colon) {
    const labelKey = normalizeNoteKey(colon.label);
    if (GENERIC_COLON_LABELS.has(labelKey) || labelKey.startsWith("falta")) {
      const referent = topic || section;
      const title = referent || colon.label;
      return {
        note: {
          title,
          body: joinNoteParts([colon.rest, extras]),
          category,
        },
        ctx: { section, topic },
      };
    }

    topic = colon.label;
    if (SECTION_HEADERS.has(labelKey)) {
      section = colon.label;
    }
    return {
      note: {
        title: colon.label,
        body: joinNoteParts([colon.rest, extras]),
        category,
      },
      ctx: { section, topic },
    };
  }

  if (CONTINUATION_RE.test(name) && (topic || section)) {
    const referent = topic || section!;
    return {
      note: {
        title: referent,
        body: joinNoteParts([name, extras]),
        category,
      },
      ctx: { section, topic },
    };
  }

  // Self-contained tip under a section: keep its own title, remember as topic.
  if (name.length <= 60) {
    topic = name;
  }

  return {
    note: {
      title: name,
      body: extras,
      category,
    },
    ctx: { section, topic },
  };
}

export async function listGardenNotes(gardenId?: string) {
  const gid = await resolveGardenId(gardenId);
  return prisma.gardenNote.findMany({
    where: { gardenId: gid },
    orderBy: [{ createdAt: "desc" }, { title: "asc" }],
  });
}

export async function createGardenNote(
  input: GardenNoteInput,
  gardenId?: string,
) {
  const gid = await resolveGardenId(gardenId);
  const title = input.title.trim();
  if (!title) {
    throw new Error("La nota necesita un título");
  }

  return prisma.gardenNote.create({
    data: {
      gardenId: gid,
      title,
      body: input.body?.trim() || null,
      category: input.category?.trim() || "tip",
      done: false,
    },
  });
}

export async function updateGardenNote(
  id: string,
  input: Partial<GardenNoteInput>,
) {
  await assertNoteInGarden(id);
  const data: {
    title?: string;
    body?: string | null;
    category?: string;
    done?: boolean;
  } = {};

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      throw new Error("La nota necesita un título");
    }
    data.title = title;
  }
  if (input.body !== undefined) {
    data.body = input.body?.trim() || null;
  }
  if (input.category !== undefined) {
    data.category = input.category?.trim() || "tip";
  }
  if (input.done !== undefined) {
    data.done = Boolean(input.done);
  }

  return prisma.gardenNote.update({
    where: { id },
    data,
  });
}

export async function deleteGardenNote(id: string) {
  await assertNoteInGarden(id);
  return prisma.gardenNote.delete({ where: { id } });
}

export async function replaceAllGardenNotes(
  notes: GardenNoteInput[],
  gardenId?: string,
) {
  const gid = await resolveGardenId(gardenId);
  await prisma.gardenNote.deleteMany({ where: { gardenId: gid } });
  for (const note of notes) {
    await createGardenNote(note, gid);
  }
  return notes.length;
}
