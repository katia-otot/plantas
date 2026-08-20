import { buildBackupExport, backupFilename } from "@/lib/backup";

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
