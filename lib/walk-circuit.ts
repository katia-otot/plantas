import { prisma } from "@/lib/db";
import { resolveGardenId } from "@/lib/garden-access";
import {
  clampPercent,
  computeWalkOrder,
  isFinitePoint,
  type WalkPoint,
  type WalkStrokeData,
} from "@/lib/walk-circuit-geometry";

export type {
  WalkPoint,
  WalkStrokeData,
} from "@/lib/walk-circuit-geometry";
export {
  connectionPreviews,
  computeWalkOrder,
  projectPlantOntoStrokes,
} from "@/lib/walk-circuit-geometry";

export type WalkCircuitData = {
  strokes: WalkStrokeData[];
  updatedAt: string | null;
};

export function parsePointsJson(raw: string): WalkPoint[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isFinitePoint)
      .map((point) => ({
        x: clampPercent(Number(point.x)),
        y: clampPercent(Number(point.y)),
      }))
      .filter((point, index, list) => {
        if (index === 0) {
          return true;
        }
        const prev = list[index - 1]!;
        return Math.hypot(point.x - prev.x, point.y - prev.y) > 0.05;
      });
  } catch {
    return [];
  }
}

export function serializePoints(points: WalkPoint[]): string {
  return JSON.stringify(
    points.map((point) => ({
      x: clampPercent(point.x),
      y: clampPercent(point.y),
    })),
  );
}

export function normalizeStrokePayload(strokes: unknown): WalkStrokeData[] {
  if (!Array.isArray(strokes)) {
    throw new Error("Tramos inválidos");
  }

  const normalized: WalkStrokeData[] = [];
  for (let i = 0; i < strokes.length; i += 1) {
    const raw = strokes[i] as { points?: unknown };
    if (!raw || !Array.isArray(raw.points)) {
      throw new Error("Tramo sin puntos");
    }
    const points = raw.points
      .filter(isFinitePoint)
      .map((point) => ({
        x: clampPercent(Number(point.x)),
        y: clampPercent(Number(point.y)),
      }));
    if (points.length < 2) {
      continue;
    }
    normalized.push({ index: normalized.length, points });
  }
  return normalized;
}

export async function getWalkCircuit(
  gardenId?: string,
): Promise<WalkCircuitData> {
  const gid = await resolveGardenId(gardenId);
  const circuit = await prisma.walkCircuit.findUnique({
    where: { gardenId: gid },
    include: {
      strokes: { orderBy: { index: "asc" } },
    },
  });

  if (!circuit) {
    return { strokes: [], updatedAt: null };
  }

  return {
    updatedAt: circuit.updatedAt.toISOString(),
    strokes: circuit.strokes.map((stroke) => ({
      index: stroke.index,
      points: parsePointsJson(stroke.pointsJson),
    })),
  };
}

export async function recalculateWalkOrders(gardenId: string) {
  const [circuit, plants] = await Promise.all([
    prisma.walkCircuit.findUnique({
      where: { gardenId },
      include: { strokes: { orderBy: { index: "asc" } } },
    }),
    prisma.plant.findMany({
      where: { gardenId },
      select: {
        id: true,
        name: true,
        mapX: true,
        mapY: true,
        status: true,
        walkOrder: true,
      },
    }),
  ]);

  const strokes: WalkStrokeData[] =
    circuit?.strokes.map((stroke) => ({
      index: stroke.index,
      points: parsePointsJson(stroke.pointsJson),
    })) ?? [];

  const placed = plants.filter(
    (
      plant,
    ): plant is {
      id: string;
      name: string;
      mapX: number;
      mapY: number;
      status: string;
      walkOrder: number | null;
    } =>
      plant.status === "alta" && plant.mapX != null && plant.mapY != null,
  );

  const ordered =
    strokes.length > 0 ? computeWalkOrder(placed, strokes) : [];
  const orderById = new Map(
    ordered.map((item) => [item.plantId, item.walkOrder]),
  );

  const updates = plants
    .map((plant) => {
      const nextOrder = orderById.get(plant.id) ?? null;
      if (plant.walkOrder === nextOrder) {
        return null;
      }
      return { id: plant.id, walkOrder: nextOrder };
    })
    .filter(
      (item): item is { id: string; walkOrder: number | null } => item != null,
    );

  if (updates.length === 0) {
    return ordered;
  }

  // OneDrive SQLite can be slow; avoid the default 5s interactive timeout.
  await prisma.$transaction(
    updates.map((item) =>
      prisma.plant.update({
        where: { id: item.id },
        data: { walkOrder: item.walkOrder },
      }),
    ),
    { timeout: 60_000 },
  );

  return ordered;
}

export async function saveWalkCircuit(
  strokesInput: unknown,
  gardenId?: string,
): Promise<WalkCircuitData> {
  const gid = await resolveGardenId(gardenId);
  const strokes = normalizeStrokePayload(strokesInput);

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.walkCircuit.findUnique({
        where: { gardenId: gid },
        select: { id: true },
      });

      const circuit =
        existing ??
        (await tx.walkCircuit.create({
          data: { gardenId: gid },
          select: { id: true },
        }));

      await tx.walkStroke.deleteMany({ where: { circuitId: circuit.id } });

      if (strokes.length > 0) {
        await tx.walkStroke.createMany({
          data: strokes.map((stroke) => ({
            circuitId: circuit.id,
            index: stroke.index,
            pointsJson: serializePoints(stroke.points),
          })),
        });
      }

      await tx.walkCircuit.update({
        where: { id: circuit.id },
        data: { updatedAt: new Date() },
      });
    },
    { timeout: 60_000 },
  );

  await recalculateWalkOrders(gid);
  return getWalkCircuit(gid);
}
