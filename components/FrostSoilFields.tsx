"use client";

import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import {
  FROST_CATEGORIES,
  parseFrostCelsius,
  parseFrostValue,
  serializeFrostValue,
} from "@/lib/frost";
import {
  SOIL_PH_CATEGORIES,
  SOIL_PH_LABELS,
  parseSoilPhNumber,
  parseSoilPhValue,
  serializeSoilPhValue,
  type SoilPhCategory,
} from "@/lib/soil-ph";

type Props = {
  frostResistance: string;
  soilType: string;
  observations: string;
  onFrostChange: (value: string) => void;
  onSoilChange: (value: string) => void;
  onObservationsChange: (value: string) => void;
};

function frostModeFromStored(stored: string): string {
  const parsed = parseFrostValue(stored);
  if (!parsed) {
    return "";
  }
  if (parsed.kind === "category") {
    return parsed.category;
  }
  return "__celsius";
}

function soilModeFromStored(stored: string): string {
  const parsed = parseSoilPhValue(stored);
  if (!parsed) {
    return "";
  }
  if (parsed.kind === "category") {
    return parsed.category;
  }
  return "__ph";
}

function frostDraftFromStored(stored: string): string {
  const parsed = parseFrostValue(stored);
  return parsed?.kind === "celsius" ? String(parsed.celsius) : "";
}

function soilDraftFromStored(stored: string): string {
  const parsed = parseSoilPhValue(stored);
  return parsed?.kind === "ph" ? String(parsed.ph) : "";
}

export function FrostSoilFields({
  frostResistance,
  soilType,
  observations,
  onFrostChange,
  onSoilChange,
  onObservationsChange,
}: Props) {
  const frostEditing = useRef(false);
  const soilEditing = useRef(false);
  const [frostMode, setFrostMode] = useState(() =>
    frostModeFromStored(frostResistance),
  );
  const [soilMode, setSoilMode] = useState(() =>
    soilModeFromStored(soilType),
  );
  const [frostDraft, setFrostDraft] = useState(() =>
    frostDraftFromStored(frostResistance),
  );
  const [soilDraft, setSoilDraft] = useState(() =>
    soilDraftFromStored(soilType),
  );

  useEffect(() => {
    if (frostEditing.current) {
      return;
    }
    setFrostMode(frostModeFromStored(frostResistance));
    setFrostDraft(frostDraftFromStored(frostResistance));
  }, [frostResistance]);

  useEffect(() => {
    if (soilEditing.current) {
      return;
    }
    setSoilMode(soilModeFromStored(soilType));
    setSoilDraft(soilDraftFromStored(soilType));
  }, [soilType]);

  function commitFrostDraft(raw: string) {
    if (!raw.trim()) {
      setFrostMode("");
      onFrostChange("");
      return;
    }
    const parsed = parseFrostCelsius(raw);
    if (parsed != null) {
      onFrostChange(
        serializeFrostValue({ kind: "celsius", celsius: parsed })!,
      );
    }
  }

  function commitSoilDraft(raw: string) {
    if (!raw.trim()) {
      setSoilMode("");
      onSoilChange("");
      return;
    }
    const parsed = parseSoilPhNumber(raw);
    if (parsed != null) {
      onSoilChange(serializeSoilPhValue({ kind: "ph", ph: parsed })!);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-950">
          <ActionIcon name="heladas" size={28} alt="" />
          Resistencia a heladas
        </span>
        <select
          value={frostMode}
          onChange={(event) => {
            const next = event.target.value;
            setFrostMode(next);
            if (!next) {
              setFrostDraft("");
              onFrostChange("");
              return;
            }
            if (next === "__celsius") {
              setFrostDraft(frostDraftFromStored(frostResistance) || "");
              return;
            }
            setFrostDraft("");
            onFrostChange(next);
          }}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="">Sin tipificar</option>
          {FROST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
          <option value="__celsius">Temperatura mínima °C</option>
        </select>
        {frostMode === "__celsius" ? (
          <input
            type="number"
            step="1"
            value={frostDraft}
            onFocus={() => {
              frostEditing.current = true;
            }}
            onChange={(event) => {
              const raw = event.target.value;
              setFrostDraft(raw);
              if (!raw.trim()) {
                // Keep mode so you can correct; clear only on blur / Sin tipificar.
                return;
              }
              const parsed = parseFrostCelsius(raw);
              if (parsed != null) {
                onFrostChange(
                  serializeFrostValue({ kind: "celsius", celsius: parsed })!,
                );
              }
            }}
            onBlur={() => {
              frostEditing.current = false;
              commitFrostDraft(frostDraft);
            }}
            className="mt-2 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            placeholder="Ej. -5"
          />
        ) : null}
        <p className="mt-1 text-xs text-emerald-900/60">
          Categoría o °C (se agrupa por umbrales). Vacío al salir del campo =
          Sin tipificar. Detalles libres van en observaciones.
        </p>
      </div>

      <div>
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-950">
          <ActionIcon name="ph-suelo" size={28} alt="" />
          pH del suelo
        </span>
        <select
          value={soilMode}
          onChange={(event) => {
            const next = event.target.value;
            setSoilMode(next);
            if (!next) {
              setSoilDraft("");
              onSoilChange("");
              return;
            }
            if (next === "__ph") {
              setSoilDraft(soilDraftFromStored(soilType) || "");
              return;
            }
            setSoilDraft("");
            onSoilChange(next as SoilPhCategory);
          }}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
        >
          <option value="">Sin tipificar</option>
          {SOIL_PH_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {SOIL_PH_LABELS[category]}
            </option>
          ))}
          <option value="__ph">pH numérico</option>
        </select>
        {soilMode === "__ph" ? (
          <input
            type="number"
            step="0.1"
            min={0}
            max={14}
            value={soilDraft}
            onFocus={() => {
              soilEditing.current = true;
            }}
            onChange={(event) => {
              const raw = event.target.value;
              setSoilDraft(raw);
              if (!raw.trim()) {
                return;
              }
              const parsed = parseSoilPhNumber(raw);
              if (parsed != null) {
                onSoilChange(
                  serializeSoilPhValue({ kind: "ph", ph: parsed })!,
                );
              }
            }}
            onBlur={() => {
              soilEditing.current = false;
              commitSoilDraft(soilDraft);
            }}
            className="mt-2 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
            placeholder="Ej. 6.5"
          />
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-emerald-950">
          Observaciones
        </span>
        <textarea
          value={observations}
          onChange={(event) => onObservationsChange(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-xl border border-emerald-900/15 px-3 py-3 text-base outline-none ring-emerald-500 focus:ring-2"
          placeholder="Notas libres: heladas, suelo, cuidados, etc."
        />
      </label>
    </div>
  );
}
