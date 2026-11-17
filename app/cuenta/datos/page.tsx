import Link from "next/link";
import { ActionIcon } from "@/components/ActionIcon";
import { BackupDownloadButton } from "@/components/BackupDownloadButton";
import { BackupRestoreButton } from "@/components/BackupRestoreButton";
import { ImportExcelButton } from "@/components/ImportExcelButton";

export default function DatosPage() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-5 px-4 py-8">
      <div>
        <Link
          href="/cuenta"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Cuenta
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-emerald-950">Datos</h1>
        <p className="mt-1 text-sm text-emerald-900/70">
          Importar planilla y respaldos del patio.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <ActionIcon name="respaldo-datos" size={28} alt="" />
            Respaldo
          </p>
          <p className="mt-1 text-sm text-emerald-900/70">
            JSON completo: plantas, historial, lluvia y fotos.
          </p>
        </div>
        <div className="space-y-2">
          <BackupDownloadButton />
          <BackupRestoreButton />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <ActionIcon name="importacion" size={28} alt="" />
            Importar planilla
          </p>
          <p className="mt-1 text-sm text-emerald-900/70">
            Excel o CSV para carga inicial. No reemplaza un respaldo JSON.
          </p>
        </div>
        <ImportExcelButton />
      </section>
    </main>
  );
}
