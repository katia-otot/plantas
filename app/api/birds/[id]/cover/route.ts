import { NextResponse } from "next/server";
import { updateBirdCoverPhoto } from "@/lib/birds";

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
      const bird = await updateBirdCoverPhoto(id, null);
      return NextResponse.json(bird);
    }

    if (typeof body.coverPhotoPath !== "string" || !body.coverPhotoPath.trim()) {
      return NextResponse.json(
        { error: "Foto inválida" },
        { status: 400 },
      );
    }

    const bird = await updateBirdCoverPhoto(id, body.coverPhotoPath);
    return NextResponse.json(bird);
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
