import { NextResponse } from "next/server";
import { updatePlantCoverPhoto } from "@/lib/plants";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      coverPhotoPath?: unknown;
      clear?: unknown;
    };

    if (body.clear === true) {
      const plant = await updatePlantCoverPhoto(id, null);
      return NextResponse.json(plant);
    }

    if (typeof body.coverPhotoPath !== "string" || !body.coverPhotoPath.trim()) {
      return NextResponse.json(
        { error: "Foto inválida" },
        { status: 400 },
      );
    }

    const plant = await updatePlantCoverPhoto(id, body.coverPhotoPath);
    return NextResponse.json(plant);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo guardar",
      },
      { status: 500 },
    );
  }
}
