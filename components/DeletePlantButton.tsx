"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function DeletePlantButton({ plantId }: { plantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta planta y todo su historial?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(withBasePath(`/api/plants/${plantId}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar");
      }

      router.push("/plants");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo eliminar la planta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleDelete}
      className="rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
    >
      {loading ? "Eliminando..." : "Eliminar planta"}
    </button>
  );
}
