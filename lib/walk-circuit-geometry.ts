/** Board aspect width/height — same as PatioMapBoard. */
export const MAP_BOARD_ASPECT = 610 / 1024;

export type WalkPoint = { x: number; y: number };

export type WalkStrokeData = {
  index: number;
  points: WalkPoint[];
};

type PlacedPlant = {
  id: string;
  name: string;
  mapX: number;
  mapY: number;
};

type Projection = {
  plantId: string;
  name: string;
  strokeIndex: number;
  arcAlongStroke: number;
  distance: number;
  foot: WalkPoint;
};

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function isFinitePoint(point: unknown): point is WalkPoint {
  if (!point || typeof point !== "object") {
    return false;
  }
  const candidate = point as { x?: unknown; y?: unknown };
  return Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
}

/** Scale % coords so Euclidean distance matches board pixels. */
function metricPoint(point: WalkPoint): WalkPoint {
  return {
    x: point.x,
    y: point.y / MAP_BOARD_ASPECT,
  };
}

function segmentLength(a: WalkPoint, b: WalkPoint) {
  const ma = metricPoint(a);
  const mb = metricPoint(b);
  return Math.hypot(mb.x - ma.x, mb.y - ma.y);
}

function closestOnSegment(
  point: WalkPoint,
  a: WalkPoint,
  b: WalkPoint,
): { foot: WalkPoint; t: number; distance: number; arc: number } {
  const mp = metricPoint(point);
  const ma = metricPoint(a);
  const mb = metricPoint(b);
  const dx = mb.x - ma.x;
  const dy = mb.y - ma.y;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = ((mp.x - ma.x) * dx + (mp.y - ma.y) * dy) / lenSq;
    t = Math.min(1, Math.max(0, t));
  }
  const foot: WalkPoint = {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
  const mf = metricPoint(foot);
  return {
    foot,
    t,
    distance: Math.hypot(mp.x - mf.x, mp.y - mf.y),
    arc: Math.hypot(mf.x - ma.x, mf.y - ma.y),
  };
}

export function projectPlantOntoStrokes(
  plant: PlacedPlant,
  strokes: WalkStrokeData[],
): Projection | null {
  const ordered = [...strokes]
    .filter((stroke) => stroke.points.length >= 2)
    .sort((a, b) => a.index - b.index);
  if (ordered.length === 0) {
    return null;
  }

  let best: Projection | null = null;
  for (const stroke of ordered) {
    let arcBefore = 0;
    for (let i = 0; i < stroke.points.length - 1; i += 1) {
      const a = stroke.points[i]!;
      const b = stroke.points[i + 1]!;
      const hit = closestOnSegment(
        { x: plant.mapX, y: plant.mapY },
        a,
        b,
      );
      const candidate: Projection = {
        plantId: plant.id,
        name: plant.name,
        strokeIndex: stroke.index,
        arcAlongStroke: arcBefore + hit.arc,
        distance: hit.distance,
        foot: hit.foot,
      };
      if (
        !best ||
        candidate.distance < best.distance - 1e-9 ||
        (Math.abs(candidate.distance - best.distance) <= 1e-9 &&
          (candidate.strokeIndex < best.strokeIndex ||
            (candidate.strokeIndex === best.strokeIndex &&
              candidate.arcAlongStroke < best.arcAlongStroke)))
      ) {
        best = candidate;
      }
      arcBefore += segmentLength(a, b);
    }
  }
  return best;
}

export function computeWalkOrder(
  plants: PlacedPlant[],
  strokes: WalkStrokeData[],
): { plantId: string; walkOrder: number; foot: WalkPoint }[] {
  const projections = plants
    .map((plant) => projectPlantOntoStrokes(plant, strokes))
    .filter((item): item is Projection => item != null);

  projections.sort((a, b) => {
    if (a.strokeIndex !== b.strokeIndex) {
      return a.strokeIndex - b.strokeIndex;
    }
    if (a.arcAlongStroke !== b.arcAlongStroke) {
      return a.arcAlongStroke - b.arcAlongStroke;
    }
    return a.name.localeCompare(b.name, "es");
  });

  return projections.map((item, walkOrder) => ({
    plantId: item.plantId,
    walkOrder,
    foot: item.foot,
  }));
}

export function connectionPreviews(
  plants: PlacedPlant[],
  strokes: WalkStrokeData[],
): { plantId: string; from: WalkPoint; to: WalkPoint }[] {
  return plants
    .map((plant) => {
      const projection = projectPlantOntoStrokes(plant, strokes);
      if (!projection) {
        return null;
      }
      return {
        plantId: plant.id,
        from: { x: plant.mapX, y: plant.mapY },
        to: projection.foot,
      };
    })
    .filter(
      (item): item is { plantId: string; from: WalkPoint; to: WalkPoint } =>
        item != null,
    );
}
