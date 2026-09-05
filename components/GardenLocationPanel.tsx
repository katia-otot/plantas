"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";

/** Optional garden GPS for Open-Meteo rain prompts. */
export function GardenLocationPanel() {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(
          withBasePath("/api/settings/garden-location"),
        );
        if (!response.ok) {
          setLoaded(true);
          return;
        }
        const data = (await response.json()) as {
          latitude: number | null;
          longitude: number | null;
          locationLabel: string | null;
        };
        if (data.latitude != null && data.longitude != null) {
          setLatitude(String(data.latitude));
          setLongitude(String(data.longitude));
          setLocationLabel(data.locationLabel);
          setSaved(true);
          setEditing(false);
        } else {
          setEditing(true);
        }
      } catch {
        setEditing(true);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function save() {
    const lat = Number(latitude.replace(",", "."));
    const lon = Number(longitude.replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      alert("Ingresá latitud y longitud numéricas");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        withBasePath("/api/settings/garden-location"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        locationLabel?: string | null;
        latitude?: number;
        longitude?: number;
      };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar");
      }
      setLatitude(String(data.latitude ?? lat));
      setLongitude(String(data.longitude ?? lon));
      setLocationLabel(data.locationLabel ?? null);
      setSaved(true);
      setEditing(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <section className="space-y-2 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-3">
        <h3 className="text-sm font-semibold text-emerald-950">
          Ubicación del jardín (clima)
        </h3>
        <p className="text-xs text-emerald-900/70">Cargando…</p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-3">
      <h3 className="text-sm font-semibold text-emerald-950">
        Ubicación del jardín (clima)
      </h3>
      <p className="text-xs text-emerald-900/70">
        Necesaria para avisos automáticos de lluvia. Ejemplo CABA: -34.6037,
        -58.3816.
      </p>

      {saved && !editing ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-950">
            {locationLabel ? (
              <>
                <span className="font-semibold">{locationLabel}</span>
                <span className="text-emerald-900/70">
                  {" "}
                  ({latitude}, {longitude})
                </span>
              </>
            ) : (
              <span className="font-semibold">
                {latitude}, {longitude}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-emerald-800/30 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50"
          >
            Editar
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Latitud"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="w-28 rounded-lg border border-emerald-900/15 px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Longitud"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="w-28 rounded-lg border border-emerald-900/15 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={loading}
            onClick={save}
            className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "..." : "Guardar"}
          </button>
          {saved ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-emerald-800/30 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-950 disabled:opacity-60"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
