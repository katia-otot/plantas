import * as XLSX from "xlsx";
import {
  defaultNewPlantTreatments,
  type PlantTreatment,
} from "@/lib/treatments";
import type { PlantInput } from "@/lib/plants";
import { isGardenNoteText } from "@/lib/garden-notes";
import { parseFrostValue, serializeFrostValue } from "@/lib/frost";
import { parseSoilPhValue, serializeSoilPhValue } from "@/lib/soil-ph";
import { ACTIVE_PLANT_STATUS, normalizePlantStatus } from "@/lib/types";

export type ImportPlantRow = PlantInput & {
  frostResistance?: string | null;
  soilType?: string | null;
  fertilizerType?: string | null;
};

/** Kept for API compatibility; tip/note rows are skipped on import (not persisted). */
export type ImportGardenNoteRow = {
  title: string;
  body?: string | null;
  category?: string | null;
};

export type ImportParseResult = {
  rows: ImportPlantRow[];
  notes: ImportGardenNoteRow[];
  skipped: number;
  mergedDuplicates: number;
  headers: string[];
  sheetName?: string;
};

function normalizeHeader(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === "#") {
    return "#";
  }

  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function cellNumber(value: unknown, fallback: number): number {
  const parsed = parsePositiveNumber(value);
  return parsed ?? fallback;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  const text = cellText(value);
  if (!text) {
    return null;
  }

  // Allow ranges like "10-14" → use the first number.
  const rangeMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*\d+/);
  if (rangeMatch) {
    const first = Number(rangeMatch[1].replace(",", "."));
    return Number.isFinite(first) && first > 0 ? Math.round(first) : null;
  }

  const parsed = Number(text.replace(",", "."));
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed);
  }

  return null;
}

function cellBoolean(value: unknown): boolean {
  const text = cellText(value)?.toLowerCase();
  if (!text) {
    return false;
  }

  return ["1", "si", "sí", "true", "yes", "y", "interior", "indoor"].includes(
    text,
  );
}

function joinTexts(values: Array<string | null | undefined>): string | null {
  const parts = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  // Preserve order, drop exact duplicates.
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) {
      unique.push(part);
    }
  }
  return unique.length > 0 ? unique.join("\n") : null;
}

/** Patio plant # column: 21, 25b, 25c, … — not tip text. */
function isPlantRowId(value: unknown): boolean {
  if (typeof value === "number" && Number.isFinite(value)) {
    return true;
  }
  const text = cellText(value);
  if (!text) {
    return false;
  }
  return /^\d+(\.0+)?[a-zA-Z]?$/.test(text);
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: [
    "nombre",
    "planta",
    "name",
    "plant",
    "nombre comun",
    "nombre planta",
    "riegos cada x dias",
  ],
  species: [
    "especie",
    "species",
    "nombre cientifico",
    "cientifico",
    "variedad",
  ],
  location: ["ubicacion", "lugar", "location", "zona", "sector"],
  notes: ["notas", "notes", "comentarios", "comentario"],
  noteExtras: ["observaciones", "observacion", "observations", "obs"],
  bidones: ["bidones", "bidon"],
  quantity: ["cantidad", "quantity", "qty", "cant", "unidades"],
  status: [
    "estado",
    "status",
    "state",
    "situacion",
    "alta baja",
    "plant status",
  ],
  frostResistance: [
    "resistencia a las heladas",
    "resistencia heladas",
    "heladas",
    "helada",
    "frost",
    "frost resistance",
  ],
  soilType: ["tipo de suelo", "suelo", "soil", "soil type", "tierra"],
  fertilizerType: [
    "tipo de fertilizante",
    "fertilizar mejor no usar quimicos",
    "fertilizar",
    "fertilizante",
    "fertilizer",
    "abono",
    "tipo abono",
  ],
  isIndoor: ["interior", "indoor", "de interior"],
  waterSummerDays: [
    "riego verano",
    "verano dias",
    "dias verano",
    "water summer",
    "verano",
  ],
  waterWinterDays: [
    "riego invierno",
    "invierno dias",
    "dias invierno",
    "water winter",
    "invierno",
  ],
  pruneNotes: ["poda", "detalle poda"],
  id: ["#", "numero", "id"],
};

function headersMatch(header: string, alias: string): boolean {
  if (!header || !alias) {
    return false;
  }
  if (header === alias) {
    return true;
  }
  // Avoid tiny headers like "v" matching inside longer aliases.
  if (header.length < 3 || alias.length < 3) {
    return false;
  }
  return header.includes(alias) || alias.includes(header);
}

function findColumn(
  headers: string[],
  aliases: string[],
  used: Set<number>,
): number {
  for (const alias of aliases) {
    const index = headers.findIndex(
      (header, headerIndex) =>
        !used.has(headerIndex) && headersMatch(header, alias),
    );
    if (index >= 0) {
      used.add(index);
      return index;
    }
  }
  return -1;
}

function findExactColumn(
  headers: string[],
  aliases: string[],
  used: Set<number>,
): number {
  for (const alias of aliases) {
    const index = headers.findIndex(
      (header, headerIndex) =>
        !used.has(headerIndex) && header === alias,
    );
    if (index >= 0) {
      used.add(index);
      return index;
    }
  }
  return -1;
}

function buildTreatmentsFromFertilizer(
  fertilizerType: string | null,
  pruneNotes?: string | null,
): PlantTreatment[] {
  const treatments: PlantTreatment[] = fertilizerType
    ? [{ type: "fertilizante", products: [fertilizerType] }]
    : defaultNewPlantTreatments();

  const prune = pruneNotes?.trim();
  if (prune) {
    treatments.push({ type: "poda", products: [prune] });
  }

  return treatments;
}

function pickSheet(workbook: XLSX.WorkBook): { name: string; sheet: XLSX.WorkSheet } {
  const preferred = workbook.SheetNames.find(
    (name) => normalizeHeader(name) === "plantas",
  );
  const name = preferred ?? workbook.SheetNames[0];
  return { name, sheet: workbook.Sheets[name] };
}

function detectPatioLayout(headers: string[]): boolean {
  const hasHeladas = headers.some((header) => header.includes("helada"));
  const hasSuelo = headers.some((header) => header === "suelo" || header.includes("suelo"));
  const hasInvierno = headers.some((header) => header.includes("invierno"));
  const hasVerano = headers.some((header) => header.includes("verano"));
  const hasRiegosHeader = headers.some((header) =>
    header.includes("riegos cada"),
  );
  return hasHeladas && hasSuelo && hasInvierno && hasVerano && hasRiegosHeader;
}

function normalizeNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKey(row: ImportPlantRow): string {
  return [
    normalizeNameKey(row.name),
    row.waterSummerDays ?? "",
    row.waterWinterDays ?? "",
    row.frostResistance?.trim().toLowerCase() ?? "",
    row.soilType?.trim().toLowerCase() ?? "",
    row.fertilizerType?.trim().toLowerCase() ?? "",
  ].join("|");
}

function mergePlantRows(rows: ImportPlantRow[]): {
  rows: ImportPlantRow[];
  mergedDuplicates: number;
} {
  const merged = new Map<string, ImportPlantRow>();
  let mergedDuplicates = 0;

  for (const row of rows) {
    const key = dedupeKey(row);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...row });
      continue;
    }

    mergedDuplicates += 1;
    existing.quantity = Math.max(existing.quantity ?? 1, 1) + Math.max(row.quantity ?? 1, 1);
    existing.observations = joinTexts([
      existing.observations,
      existing.notes,
      row.observations,
      row.notes,
    ]);
    existing.notes = null;
    existing.frostResistance =
      existing.frostResistance || row.frostResistance || null;
    existing.soilType = existing.soilType || row.soilType || null;
    existing.species = existing.species || row.species;
    existing.location = existing.location || row.location;
    existing.bidones = existing.bidones || row.bidones;
    existing.pruneNotes = existing.pruneNotes || row.pruneNotes;
    existing.needsPruning = existing.needsPruning || row.needsPruning;
    // Prefer non-alta statuses when merging duplicates (e.g. baja wins over alta).
    if (
      existing.status === ACTIVE_PLANT_STATUS &&
      row.status &&
      row.status !== ACTIVE_PLANT_STATUS
    ) {
      existing.status = row.status;
    }
    if (!existing.careTreatments?.length && row.careTreatments?.length) {
      existing.careTreatments = row.careTreatments;
    }
  }

  return { rows: [...merged.values()], mergedDuplicates };
}

export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  filename: string,
): ImportParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  if (!workbook.SheetNames.length) {
    return { rows: [], notes: [], skipped: 0, mergedDuplicates: 0, headers: [] };
  }

  const { name: sheetName, sheet } = pickSheet(workbook);
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
    sheet,
    {
      header: 1,
      defval: null,
      raw: false,
    },
  );

  if (matrix.length < 2) {
    return {
      rows: [],
      notes: [],
      skipped: 0,
      mergedDuplicates: 0,
      headers: [],
      sheetName,
    };
  }

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((cell) => normalizeHeader(cell));
  const used = new Set<number>();
  const patioLayout = detectPatioLayout(headers);

  const columns = {
    id: findColumn(headers, FIELD_ALIASES.id, used),
    name: findColumn(headers, FIELD_ALIASES.name, used),
    species: findColumn(headers, FIELD_ALIASES.species, used),
    location: findColumn(headers, FIELD_ALIASES.location, used),
    notes: findColumn(headers, FIELD_ALIASES.notes, used),
    noteExtras: findColumn(headers, FIELD_ALIASES.noteExtras, used),
    bidones: findColumn(headers, FIELD_ALIASES.bidones, used),
    // "V" is a one-letter header — match exactly, then fall back to aliases.
    quantity: (() => {
      const exact = findExactColumn(headers, ["v"], used);
      if (exact >= 0) {
        return exact;
      }
      return findColumn(headers, FIELD_ALIASES.quantity, used);
    })(),
    status: findColumn(headers, FIELD_ALIASES.status, used),
    frostResistance: findColumn(headers, FIELD_ALIASES.frostResistance, used),
    soilType: findColumn(headers, FIELD_ALIASES.soilType, used),
    fertilizerType: findColumn(headers, FIELD_ALIASES.fertilizerType, used),
    isIndoor: findColumn(headers, FIELD_ALIASES.isIndoor, used),
    waterSummerDays: findColumn(headers, FIELD_ALIASES.waterSummerDays, used),
    waterWinterDays: findColumn(headers, FIELD_ALIASES.waterWinterDays, used),
    pruneNotes: findColumn(headers, FIELD_ALIASES.pruneNotes, used),
  };

  // Patio sheet: plant name sits under the misleading "Riegos cada X días" header.
  if (patioLayout && columns.name < 0) {
    columns.name = 1;
    used.add(1);
  }

  if (columns.name < 0) {
    const fallback = headers.findIndex(
      (header, index) =>
        !used.has(index) &&
        header.length > 0 &&
        header !== "#" &&
        header !== "n" &&
        header !== "numero" &&
        header !== "id",
    );
    if (fallback >= 0) {
      columns.name = fallback;
      used.add(fallback);
    }
  }

  if (columns.name < 0) {
    throw new Error(
      `No encontré una columna de nombre en ${filename}. Esperaba algo como "Nombre" o "Planta".`,
    );
  }

  // Untitled columns (F / L / M in the patio sheet) hold free-form notes.
  const untitledNoteIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(
      ({ header, index }) =>
        header.length === 0 &&
        index !== columns.name &&
        index !== columns.id &&
        !used.has(index),
    )
    .map(({ index }) => index);

  const rows: ImportPlantRow[] = [];
  const notes: ImportGardenNoteRow[] = [];
  let skipped = 0;

  for (const raw of matrix.slice(1)) {
    if (!raw || raw.every((cell) => cellText(cell) === null)) {
      skipped += 1;
      continue;
    }

    const idValue = columns.id >= 0 ? raw[columns.id] : null;
    const hasPlantId =
      columns.id >= 0 &&
      cellText(idValue) !== null &&
      isPlantRowId(idValue);

    if (columns.id >= 0) {
      // Skip tip/legend rows that put non-id text in the # column; allow blank #.
      if (cellText(idValue) !== null && !isPlantRowId(idValue)) {
        skipped += 1;
        continue;
      }
    }

    const name = cellText(raw[columns.name]);
    if (!name) {
      skipped += 1;
      continue;
    }

    const fertilizerType =
      columns.fertilizerType >= 0
        ? cellText(raw[columns.fertilizerType])
        : null;
    const pruneText =
      columns.pruneNotes >= 0 ? cellText(raw[columns.pruneNotes]) : null;
    const bidones =
      columns.bidones >= 0 ? cellText(raw[columns.bidones]) : null;
    const primaryNotes =
      columns.notes >= 0 ? cellText(raw[columns.notes]) : null;
    const namedObservationNotes =
      columns.noteExtras >= 0 ? cellText(raw[columns.noteExtras]) : null;
    const untitledNotes = untitledNoteIndexes.map((index) =>
      cellText(raw[index]),
    );
    const frostRaw =
      columns.frostResistance >= 0
        ? cellText(raw[columns.frostResistance])
        : null;
    const soilRaw =
      columns.soilType >= 0 ? cellText(raw[columns.soilType]) : null;

    /*
     * Patio Excel ("Plantas") mixes blocks in one sheet:
     * 1) Numbered plants through ~row 53 (# 1…47, incl. 25b/c/d) — real inventory
     * 2) After blank separator: indoor wishlist / research (no #) + tips
     *
     * Rule: patio plants require a plant # (numeric or 25b-style). Tip /
     * note-like titles and unnumbered post-block rows are skipped (not
     * imported as plants or GardenNotes). Non-numeric text in C/D (dates,
     * "Maso", "Sí") does NOT count as watering days.
     */
    const asNonPlantRow =
      patioLayout &&
      (isGardenNoteText(name) || !hasPlantId);

    if (asNonPlantRow) {
      skipped += 1;
      continue;
    }

    const frostTyped = parseFrostValue(frostRaw);
    const soilTyped = parseSoilPhValue(soilRaw);
    const typedObservationParts: string[] = [];
    if (frostRaw && !frostTyped) {
      typedObservationParts.push(`Heladas (texto original):\n${frostRaw}`);
    }
    if (soilRaw && !soilTyped) {
      typedObservationParts.push(`pH / suelo (texto original):\n${soilRaw}`);
    }

    const careTreatments = buildTreatmentsFromFertilizer(
      fertilizerType,
      pruneText,
    );

    rows.push({
      name,
      species:
        columns.species >= 0 ? cellText(raw[columns.species]) : null,
      location:
        columns.location >= 0 ? cellText(raw[columns.location]) : null,
      notes: null,
      observations: joinTexts([
        ...typedObservationParts,
        primaryNotes,
        namedObservationNotes,
        ...untitledNotes,
      ]),
      bidones,
      quantity:
        columns.quantity >= 0 ? cellNumber(raw[columns.quantity], 1) : 1,
      status:
        columns.status >= 0
          ? normalizePlantStatus(cellText(raw[columns.status]))
          : ACTIVE_PLANT_STATUS,
      frostResistance: frostTyped ? serializeFrostValue(frostTyped) : null,
      soilType: soilTyped ? serializeSoilPhValue(soilTyped) : null,
      fertilizerType,
      isIndoor:
        columns.isIndoor >= 0 ? cellBoolean(raw[columns.isIndoor]) : false,
      waterSummerDays:
        columns.waterSummerDays >= 0
          ? cellNumber(raw[columns.waterSummerDays], 2)
          : 2,
      waterWinterDays:
        columns.waterWinterDays >= 0
          ? cellNumber(raw[columns.waterWinterDays], 5)
          : 5,
      needsPruning: Boolean(pruneText),
      pruneNotes: pruneText,
      careTreatments,
    });
  }

  const deduped = mergePlantRows(rows);

  return {
    rows: deduped.rows,
    notes,
    skipped,
    mergedDuplicates: deduped.mergedDuplicates,
    headers: headerRow.map((cell) => String(cell ?? "").trim()).filter(Boolean),
    sheetName,
  };
}
