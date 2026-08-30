/** Typed frost resistance: category or minimum °C. */

export const FROST_CATEGORIES = [
  "Vulnerable",
  "Moderada",
  "Buena",
  "Excelente",
] as const;

export type FrostCategory = (typeof FROST_CATEGORIES)[number];

export type FrostValue =
  | { kind: "category"; category: FrostCategory }
  | { kind: "celsius"; celsius: number };

export function isFrostCategory(value: string): value is FrostCategory {
  return (FROST_CATEGORIES as readonly string[]).includes(value);
}

/** Parse stored typed value (category or number). Free text → null. */
export function parseFrostValue(raw: string | null | undefined): FrostValue | null {
  if (!raw?.trim()) {
    return null;
  }
  const text = raw.trim();

  for (const category of FROST_CATEGORIES) {
    if (text.toLowerCase() === category.toLowerCase()) {
      return { kind: "category", category };
    }
  }

  const celsius = parseFrostCelsius(text);
  if (celsius != null) {
    return { kind: "celsius", celsius };
  }

  return null;
}

/** Strict: whole field is only a temperature like -5, -5°, -5°C. */
export function parseFrostCelsius(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  const match = normalized.match(/^-?\d+(?:\.\d+)?\s*°?\s*[cC]?°?$/);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : null;
}

export function serializeFrostValue(value: FrostValue | null): string | null {
  if (!value) {
    return null;
  }
  if (value.kind === "category") {
    return value.category;
  }
  return String(value.celsius);
}

export function formatFrostValue(value: FrostValue): string {
  if (value.kind === "category") {
    return value.category;
  }
  return `${value.celsius}°C`;
}

/** Map °C mínimos to the consultation category buckets. */
export function frostCategoryFromCelsius(celsius: number): FrostCategory {
  if (celsius > -3) {
    return "Vulnerable";
  }
  if (celsius > -10) {
    return "Moderada";
  }
  if (celsius > -15) {
    return "Buena";
  }
  return "Excelente";
}

/** Category used for grouping (numbers fold into Vulnerable/Moderada/…). */
export function frostGroupCategory(
  value: FrostValue | null,
): FrostCategory | null {
  if (!value) {
    return null;
  }
  if (value.kind === "category") {
    return value.category;
  }
  return frostCategoryFromCelsius(value.celsius);
}

/**
 * Alert colors:
 * - vulnerable / warmer than -3°C → alert (rojo)
 * - moderada / warmer than -1°C → warn (ámbar); rojo gana si aplica ambos
 */
export function frostTone(
  value: FrostValue | null,
): "alert" | "warn" | "ok" | "empty" {
  if (!value) {
    return "empty";
  }

  const category = frostGroupCategory(value);
  if (category === "Vulnerable") {
    return "alert";
  }
  if (category === "Moderada") {
    return "warn";
  }
  return "ok";
}

export const FROST_TONE_STYLES: Record<
  "alert" | "warn" | "ok" | "empty",
  { section: string; badge: string }
> = {
  alert: {
    section: "border-rose-300/80 bg-rose-50",
    badge: "bg-rose-600 text-white",
  },
  warn: {
    section: "border-amber-300/80 bg-amber-50",
    badge: "bg-amber-500 text-white",
  },
  ok: {
    section: "border-emerald-900/10 bg-white",
    badge: "bg-emerald-700 text-white",
  },
  empty: {
    section: "border-dashed border-emerald-900/20 bg-white",
    badge: "bg-emerald-900/40 text-white",
  },
};

/** Legend + group colors (same idea as pH strip chips). */
export const FROST_CATEGORY_STYLE: Record<
  FrostCategory,
  { section: string; badge: string; swatch: string; threshold: string }
> = {
  Vulnerable: {
    section: "border-rose-300 bg-[#fde8e8]",
    badge: "bg-rose-600 text-white",
    swatch: "#e74c3c",
    threshold: "> −3°C",
  },
  Moderada: {
    section: "border-amber-300 bg-[#fff3e0]",
    badge: "bg-amber-500 text-white",
    swatch: "#f39c12",
    threshold: "> −10°C",
  },
  Buena: {
    section: "border-lime-400 bg-[#f7fce8]",
    badge: "bg-[#7cb342] text-white",
    swatch: "#c0ca33",
    threshold: "> −15°C",
  },
  Excelente: {
    section: "border-teal-300 bg-[#e8f8f5]",
    badge: "bg-[#16a085] text-white",
    swatch: "#1abc9c",
    threshold: "≤ −15°C",
  },
};

export function frostStyle(value: FrostValue | null): {
  section: string;
  badge: string;
  swatch: string;
} {
  const category = frostGroupCategory(value);
  if (!category) {
    return {
      section: "border-dashed border-emerald-900/20 bg-white",
      badge: "bg-emerald-900/40 text-white",
      swatch: "#94a3b8",
    };
  }
  const style = FROST_CATEGORY_STYLE[category];
  return {
    section: style.section,
    badge: style.badge,
    swatch: style.swatch,
  };
}

export function frostSortKey(value: FrostValue | null): [number, number, string] {
  const category = frostGroupCategory(value);
  if (!category) {
    return [9, 0, ""];
  }
  return [0, FROST_CATEGORIES.indexOf(category), category];
}
