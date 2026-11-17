import Link from "next/link";
import { GardenLocationPanel } from "@/components/GardenLocationPanel";

export default function UbicacionPage() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-8">
      <div>
        <Link
          href="/cuenta"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Cuenta
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-emerald-950">
          Ubicación
        </h1>
        <p className="mt-1 text-sm text-emerald-900/70">
          Coordenadas del jardín para el clima y la lluvia.
        </p>
      </div>

      <GardenLocationPanel />
    </main>
  );
}
