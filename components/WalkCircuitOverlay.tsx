"use client";

import type { WalkPoint, WalkStrokeData } from "@/lib/walk-circuit-geometry";

const STROKE_WIDTH = 2.2;
const CONNECTION_WIDTH = 1.2;

type Props = {
  strokes: WalkStrokeData[];
  draftPoints: WalkPoint[];
  connections: { plantId: string; from: WalkPoint; to: WalkPoint }[];
  showConnections: boolean;
};

function pointsToPath(points: WalkPoint[]) {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");
}

export function WalkCircuitOverlay({
  strokes,
  draftPoints,
  connections,
  showConnections,
}: Props) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {showConnections
        ? connections.map((connection) => (
            <line
              key={connection.plantId}
              x1={connection.from.x}
              y1={connection.from.y}
              x2={connection.to.x}
              y2={connection.to.y}
              stroke="rgb(245 158 11 / 0.55)"
              strokeWidth={CONNECTION_WIDTH}
              strokeDasharray="2 1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      {strokes.map((stroke) => (
        <path
          key={stroke.index}
          d={pointsToPath(stroke.points)}
          fill="none"
          stroke="rgb(16 185 129 / 0.85)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {draftPoints.length > 0 ? (
        <path
          d={pointsToPath(draftPoints)}
          fill="none"
          stroke="rgb(245 158 11 / 0.95)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
