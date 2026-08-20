import type { CareEventType } from "./types";

export async function uploadPhotos(files: FileList | File[]): Promise<string[]> {
  const list = Array.from(files);
  const paths: string[] = [];

  for (const file of list) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error al subir imagen");
    }

    const data = (await response.json()) as { path: string };
    paths.push(data.path);
  }

  return paths;
}

export async function performAction(
  plantId: string,
  action: CareEventType,
  options?: { notes?: string; photoPaths?: string[]; happenedAt?: string; treatmentType?: string; treatmentLabel?: string },
) {
  const response = await fetch(`/api/plants/${plantId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      notes: options?.notes,
      photoPaths: options?.photoPaths,
      happenedAt: options?.happenedAt,
      treatmentType: options?.treatmentType,
      treatmentLabel: options?.treatmentLabel,
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo registrar la acción");
  }

  return response.json();
}
