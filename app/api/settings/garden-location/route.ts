import { NextResponse } from "next/server";
import { GARDEN_TIMEZONE } from "@/lib/calendar-date";
import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";
import { setGardenLocation } from "@/lib/rain-ask";
import { reverseGeocodeLabel } from "@/lib/reverse-geocode";

export async function GET() {
  try {
    const gid = await resolveGardenId();
    const settings = await prisma.gardenSettings.findUnique({
      where: { gardenId: gid },
      select: {
        latitude: true,
        longitude: true,
        timezone: true,
        locationLabel: true,
      },
    });

    let locationLabel = settings?.locationLabel ?? null;
    if (
      settings?.latitude != null &&
      settings?.longitude != null &&
      !locationLabel
    ) {
      locationLabel = await reverseGeocodeLabel(
        settings.latitude,
        settings.longitude,
      );
      if (locationLabel) {
        await prisma.gardenSettings.update({
          where: { gardenId: gid },
          data: { locationLabel },
        });
      }
    }

    return NextResponse.json({
      latitude: settings?.latitude ?? null,
      longitude: settings?.longitude ?? null,
      timezone: settings?.timezone ?? GARDEN_TIMEZONE,
      locationLabel,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo leer la ubicación" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };
    if (
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number" ||
      !Number.isFinite(body.latitude) ||
      !Number.isFinite(body.longitude)
    ) {
      return NextResponse.json(
        { error: "latitude y longitude numéricos requeridos" },
        { status: 400 },
      );
    }
    const result = await setGardenLocation({
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
    });
    return NextResponse.json({
      ok: true,
      locationLabel: result.locationLabel,
      latitude: body.latitude,
      longitude: body.longitude,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo guardar la ubicación" },
      { status: 500 },
    );
  }
}
