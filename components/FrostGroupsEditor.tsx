"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MasterSelectCheckbox } from "@/components/ListSelectHeader";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { withBasePath } from "@/lib/base-path";
import { FROST_CATEGORIES, type FrostCategory } from "@/lib/frost";
import { matchesPlantSearch } from "@/lib/plant-search";

export type FrostGroupItem = {
  id: string;
  name: string;
  status: string;
  detail: string | null;
};

export type FrostGroupView = {
  label: string;
  sectionClass: string;
  badgeClass: string;
  swatch: string;
  items: FrostGroupItem[];
};

const APPLY_OPTIONS: Array<{
  value: FrostCategory | null;
  label: string;
}> = [
  ...FROST_CATEGORIES.map((category) => ({
    value: category as FrostCategory | null,
    label: category,
  })),
  { value: null, label: "Sin tipificar" },
];

export function FrostGroupsEditor({ groups }: { groups: FrostGroupView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyValue, setApplyValue] = useState<FrostCategory | null>(
    "Vulnerable",
  );
  const [busy, setBusy] = useState(false);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            matchesPlantSearch(item.name, query),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [groups, query],
  );

  const visibleIds = useMemo(
    () => filteredGroups.flatMap((group) => group.items.map((item) => item.id)),
    [filteredGroups],
  );

  const visibleSelectedCount = useMemo(
    () => visibleIds.filter((id) => selected.has(id)).length,
    [visibleIds, selected],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  function toggleEditing() {
    if (editing) {
      setEditing(false);
      setSelected(new Set());
      return;
    }
    setEditing(true);
  }

  function togglePlant(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected((current) => {
        const next = new Set(current);
        for (const id of visibleIds) {
          next.delete(id);
        }
        return next;
      });
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        next.add(id);
      }
      return next;
    });
  }

  async function applyFrost() {
    if (selected.size === 0) {
      return;
    }

    try {
      setBusy(true);
      const response = await fetch(withBasePath("/api/plants/frost-bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantIds: [...selected],
          frostResistance: applyValue,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        updated?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo guardar");
      }
      setEditing(false);
      setSelected(new Set());
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  if (groups.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-8 text-center">
        <p className="font-semibold text-emerald-950">Todavía no hay plantas</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggleEditing}
          disabled={busy}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            editing
              ? "border border-emerald-900/15 bg-white text-emerald-950 hover:bg-emerald-50"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
        >
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>

      {editing ? (
        <section className="sticky top-2 z-10 space-y-3 rounded-2xl border border-emerald-900/10 bg-white/95 p-3 shadow-md backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {APPLY_OPTIONS.map((option) => {
              const active = applyValue === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  disabled={busy}
                  onClick={() => setApplyValue(option.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                    active
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-emerald-900/15 bg-emerald-50 text-emerald-950"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => void applyFrost()}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy
              ? "Guardando…"
              : `Aplicar a ${selected.size || "…"} planta${selected.size === 1 ? "" : "s"}`}
          </button>
        </section>
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar planta…"
        className="w-full rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm text-emerald-950"
      />

      {editing ? (
        <MasterSelectCheckbox
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected}
          disabled={busy || visibleIds.length === 0}
          label={`${selected.size} seleccionada${selected.size === 1 ? "" : "s"}`}
          onChange={toggleAllVisible}
        />
      ) : null}

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-emerald-900/70">
          No hay plantas que coincidan con “{query.trim()}”.
        </p>
      ) : null}

      {filteredGroups.map((group) => (
        <section
          key={group.label}
          className={`rounded-2xl border p-4 shadow-sm ${group.sectionClass}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-emerald-950">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: group.swatch }}
              />
              {group.label}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${group.badgeClass}`}
            >
              {group.items.length}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {group.items.map((item) => {
              const isSelected = selected.has(item.id);
              if (editing) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => togglePlant(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-emerald-950 transition disabled:opacity-60 ${
                        isSelected
                          ? "bg-emerald-700/15 ring-2 ring-emerald-600"
                          : "bg-white/70 hover:bg-white"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
                          isSelected
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-emerald-900/25 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        {item.name}
                        {item.detail ? (
                          <span className="ml-1.5 font-normal text-emerald-800/70">
                            ({item.detail})
                          </span>
                        ) : null}
                      </span>
                      {item.status !== "alta" ? (
                        <PlantStatusBadge status={item.status} />
                      ) : null}
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    href={`/plants/${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-3 text-sm font-medium text-emerald-950 hover:bg-white"
                  >
                    <span className="min-w-0">
                      {item.name}
                      {item.detail ? (
                        <span className="ml-1.5 font-normal text-emerald-800/70">
                          ({item.detail})
                        </span>
                      ) : null}
                    </span>
                    {item.status !== "alta" ? (
                      <PlantStatusBadge status={item.status} />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
