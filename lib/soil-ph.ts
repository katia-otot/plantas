/** Typed soil pH: category or numeric pH (strip-like colors). */

export const SOIL_PH_CATEGORIES = [
  "Acido",
  "Levemente Acido",
  "Neutro",
  "Levemente Alcalino",
] as const;

export type SoilPhCategory = (typeof SOIL_PH_CATEGORIES)[number];

export type SoilPhValue =
  | { kind: "category"; category: SoilPhCategory }
  | { kind: "ph"; ph: number };

export const SOIL_PH_LABELS: Record<SoilPhCategory, string> = {
  Acido: "Ácido",
  "Levemente Acido": "Levemente ácido",
  Neutro: "Neutro",
  "Levemente Alcalino": "Levemente alcalino",
};

const CATEGORY_ALIASES: Array<{ category: SoilPhCategory; patterns: RegExp[] }> =
  [
    {
      category: "Levemente Acido",
      patterns: [
        /^levemente\s+acidos?$/i,
        /^ligeramente\s+acidos?$/i,
        /^algo\s+acidos?$/i,
      ],
    },
    {
      category: "Levemente Alcalino",
      patterns: [
        /^levemente\s+alcalinos?$/i,
        /^ligeramente\s+alcalinos?$/i,
        /^algo\s+alcalinos?$/i,
      ],
    },
    {
      category: "Acido",
      patterns: [/^acidos?$/i, /^ácido$/i],
    },
    {
      category: "Neutro",
      patterns: [/^neutros?$/i],
    },
  ];

export function parseSoilPhValue(
  raw: string | null | undefined,
): SoilPhValue | null {
  if (!raw?.trim()) {
    return null;
  }
  const text = raw.trim();

  for (const category of SOIL_PH_CATEGORIES) {
    if (
      text.toLowerCase() === category.toLowerCase() ||
      text.toLowerCase() === SOIL_PH_LABELS[category].toLowerCase()
    ) {
      return { kind: "category", category };
    }
  }

  for (const entry of CATEGORY_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return { kind: "category", category: entry.category };
    }
  }

  const ph = parseSoilPhNumber(text);
  if (ph != null) {
    return { kind: "ph", ph };
  }

  return null;
}

/** Strict numeric pH (e.g. 6.5). Allows full strip range while typing/saving. */
export function parseSoilPhNumber(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 14) {
    return null;
  }
  return value;
}

export function serializeSoilPhValue(value: SoilPhValue | null): string | null {
  if (!value) {
    return null;
  }
  if (value.kind === "category") {
    return value.category;
  }
  return String(value.ph);
}

export function formatSoilPhValue(value: SoilPhValue): string {
  if (value.kind === "category") {
    return SOIL_PH_LABELS[value.category];
  }
  return `pH ${value.ph}`;
}

/** Map numeric pH to the consultation category buckets. */
export function soilPhCategoryFromNumber(ph: number): SoilPhCategory {
  if (ph < 5.5) {
    return "Acido";
  }
  if (ph < 6.5) {
    return "Levemente Acido";
  }
  if (ph < 7.5) {
    return "Neutro";
  }
  return "Levemente Alcalino";
}

export function soilPhGroupCategory(
  value: SoilPhValue | null,
): SoilPhCategory | null {
  if (!value) {
    return null;
  }
  if (value.kind === "category") {
    return value.category;
  }
  return soilPhCategoryFromNumber(value.ph);
}

/** Approximate universal indicator strip colors. */
export function soilPhStyle(value: SoilPhValue | null): {
  section: string;
  badge: string;
  swatch: string;
} {
  if (!value) {
    return {
      section: "border-dashed border-emerald-900/20 bg-white",
      badge: "bg-emerald-900/40 text-white",
      swatch: "#94a3b8",
    };
  }

  const category = soilPhGroupCategory(value)!;
  const ph =
    value.kind === "ph"
      ? value.ph
      : (
          {
            Acido: 4.5,
            "Levemente Acido": 6,
            Neutro: 7,
            "Levemente Alcalino": 8,
          } as const
        )[category];

  // Strip-like palette
  if (ph < 5.5) {
    return {
      section: "border-red-300 bg-[#fde8e8]",
      badge: "bg-[#c0392b] text-white",
      swatch: "#e74c3c",
    };
  }
  if (ph < 6.5) {
    return {
      section: "border-orange-300 bg-[#fff3e0]",
      badge: "bg-[#e67e22] text-white",
      swatch: "#f39c12",
    };
  }
  if (ph < 7.5) {
    return {
      section: "border-lime-400 bg-[#f7fce8]",
      badge: "bg-[#7cb342] text-white",
      swatch: "#c0ca33",
    };
  }
  if (ph < 8.5) {
    return {
      section: "border-teal-300 bg-[#e8f8f5]",
      badge: "bg-[#16a085] text-white",
      swatch: "#1abc9c",
    };
  }
  return {
    section: "border-sky-400 bg-[#eaf2fb]",
    badge: "bg-[#2980b9] text-white",
    swatch: "#3498db",
  };
}

export function soilPhSortKey(value: SoilPhValue | null): [number, number, string] {
  const category = soilPhGroupCategory(value);
  if (!category) {
    return [9, 0, ""];
  }
  return [0, SOIL_PH_CATEGORIES.indexOf(category), category];
}
