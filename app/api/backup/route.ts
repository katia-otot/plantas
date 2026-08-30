import { buildBackupExport, backupFilename, parseBackupJson, restoreBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backup = await buildBackupExport();
    const body = JSON.stringify(backup, null, 2);
    const filename = backupFilename(new Date(backup.exportedAt));

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "No se pudo generar el respaldo" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Subí el archivo JSON del respaldo" },
        { status: 400 },
      );
    }

    const filename = (file.name || "").toLowerCase();
    if (!filename.endsWith(".json") && file.type && !file.type.includes("json")) {
      return Response.json(
        { error: "El respaldo tiene que ser un archivo .json" },
        { status: 400 },
      );
    }

    const raw = await file.text();
    const backup = parseBackupJson(raw);
    const result = await restoreBackup(backup);

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo restaurar el respaldo",
      },
      { status: 500 },
    );
  }
}
