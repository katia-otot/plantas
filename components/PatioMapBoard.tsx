"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { activateMapPlant } from "@/lib/map-plant-activate";
import { withBasePath } from "@/lib/base-path";
import type { DueStatus } from "@/lib/types";

export type MapPlant = {
  id: string;
  name: string;
  coverPhotoPath: string | null;
  mapX: number | null;
  mapY: number | null;
  mapSize: number | null;
  careStatus: DueStatus;
};

const DEFAULT_SIZE = 9;
const MIN_SIZE = 5;
const MAX_SIZE = 22;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Props = {
  plants: MapPlant[];
  mapSrc: string;
};

type DragState =
  | {
      kind: "move";
      id: string;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "resize";
      id: string;
      startSize: number;
      startY: number;
    }
  | {
      kind: "pan";
      startX: number;
      startY: number;
      originPanX: number;
      originPanY: number;
    };

type PinchState = {
  startDistance: number;
  startScale: number;
  startPanX: number;
  startPanY: number;
  originX: number;
  originY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function MapControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(event) => event.stopPropagation()}
      className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors ${
        active
          ? "bg-amber-500 text-white"
          : "bg-white/92 text-emerald-900 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="m6.5 12.5 3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZoomResetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.5 15.5 20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.5 10.5h4M10.5 8.5v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PatioMapBoard({ plants, mapSrc }: Props) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [namedId, setNamedId] = useState<string | null>(null);
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const [local, setLocal] = useState<MapPlant[]>(() =>
    plants.map((plant) => ({
      ...plant,
      mapSize: plant.mapSize ?? DEFAULT_SIZE,
    })),
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [pinching, setPinching] = useState(false);
  const movedRef = useRef(false);
  const scaleRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  const placed = local.filter(
    (plant) => plant.mapX != null && plant.mapY != null,
  );
  const unplaced = local.filter(
    (plant) => plant.mapX == null || plant.mapY == null,
  );

  function clampPan(nextScale: number, nextPanX: number, nextPanY: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return { x: nextPanX, y: nextPanY };
    }
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const minX = width - width * nextScale;
    const minY = height - height * nextScale;
    return {
      x: clamp(nextPanX, Math.min(0, minX), 0),
      y: clamp(nextPanY, Math.min(0, minY), 0),
    };
  }

  function commitTransform(nextScale: number, nextPanX: number, nextPanY: number) {
    // Snap fully out so page scroll on the map works again.
    const safeScale =
      nextScale <= MIN_ZOOM + 0.02 ? MIN_ZOOM : clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    const clamped =
      safeScale === MIN_ZOOM
        ? { x: 0, y: 0 }
        : clampPan(safeScale, nextPanX, nextPanY);
    scaleRef.current = safeScale;
    panXRef.current = clamped.x;
    panYRef.current = clamped.y;
    setScale(safeScale);
    setPanX(clamped.x);
    setPanY(clamped.y);
  }

  function applyZoomAt(nextScale: number, originX: number, originY: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const localX = originX - rect.left;
    const localY = originY - rect.top;
    const currentScale = scaleRef.current;
    const safeScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    const ratio = safeScale / currentScale;
    const nextPanX = localX - (localX - panXRef.current) * ratio;
    const nextPanY = localY - (localY - panYRef.current) * ratio;
    commitTransform(safeScale, nextPanX, nextPanY);
  }

  function resetZoom() {
    commitTransform(MIN_ZOOM, 0, 0);
  }

  async function persist(
    id: string,
    next: { mapX: number | null; mapY: number | null; mapSize: number | null },
  ) {
    setSavingId(id);
    try {
      const response = await fetch(withBasePath(`/api/plants/${id}/map`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next.mapX == null || next.mapY == null
            ? { clear: true }
            : {
                mapX: next.mapX,
                mapY: next.mapY,
                mapSize: next.mapSize ?? DEFAULT_SIZE,
              },
        ),
      });
      if (!response.ok) {
        throw new Error("No se pudo guardar");
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar la posición");
      setLocal(plants.map((p) => ({ ...p, mapSize: p.mapSize ?? DEFAULT_SIZE })));
    } finally {
      setSavingId(null);
    }
  }

  function clientToPercent(clientX: number, clientY: number) {
    const board = boardRef.current;
    if (!board) {
      return { x: 50, y: 50 };
    }
    const rect = board.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  }

  function beginPinch() {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) {
      return;
    }
    const [a, b] = points;
    pinchRef.current = {
      startDistance: Math.max(1, pointerDistance(a!, b!)),
      startScale: scaleRef.current,
      startPanX: panXRef.current,
      startPanY: panYRef.current,
      originX: (a!.x + b!.x) / 2,
      originY: (a!.y + b!.y) / 2,
    };
    setDrag(null);
    setPinching(true);
  }

  function endPinch() {
    pinchRef.current = null;
    setPinching(false);
    if (scaleRef.current <= MIN_ZOOM + 0.02) {
      commitTransform(MIN_ZOOM, 0, 0);
    }
  }

  function updatePinch() {
    const pinch = pinchRef.current;
    const points = [...pointersRef.current.values()];
    if (!pinch || points.length < 2) {
      return;
    }
    const [a, b] = points;
    const distance = Math.max(1, pointerDistance(a!, b!));
    const nextScale = clamp(
      (distance / pinch.startDistance) * pinch.startScale,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const midX = (a!.x + b!.x) / 2;
    const midY = (a!.y + b!.y) / 2;
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const localOriginX = pinch.originX - rect.left;
    const localOriginY = pinch.originY - rect.top;
    const ratio = nextScale / pinch.startScale;
    let nextPanX = localOriginX - (localOriginX - pinch.startPanX) * ratio;
    let nextPanY = localOriginY - (localOriginY - pinch.startPanY) * ratio;
    nextPanX += midX - pinch.originX;
    nextPanY += midY - pinch.originY;
    commitTransform(nextScale, nextPanX, nextPanY);
  }

  function onPointerDownViewport(event: React.PointerEvent) {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size === 2) {
      event.preventDefault();
      beginPinch();
      return;
    }

    // When zoomed, pan from anywhere — including plant pins.
    // In edit mode, plant move/resize call stopPropagation so they win.
    if (pointersRef.current.size === 1 && scale > 1) {
      event.preventDefault();
      movedRef.current = false;
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      setDrag({
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        originPanX: panXRef.current,
        originPanY: panYRef.current,
      });
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (pointersRef.current.size >= 2 || pinchRef.current) {
      event.preventDefault();
      updatePinch();
      return;
    }

    if (!drag) {
      return;
    }

    movedRef.current = true;
    if (drag.kind === "pan") {
      const clamped = clampPan(
        scale,
        drag.originPanX + (event.clientX - drag.startX),
        drag.originPanY + (event.clientY - drag.startY),
      );
      panXRef.current = clamped.x;
      panYRef.current = clamped.y;
      setPanX(clamped.x);
      setPanY(clamped.y);
      return;
    }

    if (drag.kind === "move") {
      const { x, y } = clientToPercent(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
      );
      setLocal((current) =>
        current.map((plant) =>
          plant.id === drag.id ? { ...plant, mapX: x, mapY: y } : plant,
        ),
      );
      return;
    }

    const delta = (drag.startY - event.clientY) / 4;
    const size = clamp(drag.startSize + delta, MIN_SIZE, MAX_SIZE);
    setLocal((current) =>
      current.map((plant) =>
        plant.id === drag.id ? { ...plant, mapSize: size } : plant,
      ),
    );
  }

  function onPointerUp(event: React.PointerEvent) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      endPinch();
    }

    if (!drag) {
      return;
    }

    if (drag.kind === "pan") {
      setDrag(null);
      if (scaleRef.current <= MIN_ZOOM + 0.02) {
        commitTransform(MIN_ZOOM, 0, 0);
      }
      return;
    }

    const plant = local.find((item) => item.id === drag.id);
    setDrag(null);
    if (!plant || !movedRef.current) {
      return;
    }
    void persist(plant.id, {
      mapX: plant.mapX,
      mapY: plant.mapY,
      mapSize: plant.mapSize,
    });
  }

  function startMove(
    event: React.PointerEvent,
    plant: (typeof local)[number],
  ) {
    if (!editMode || pointersRef.current.size > 1) {
      return;
    }
    if (selectedId !== plant.id) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedId(plant.id);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    movedRef.current = false;
    const board = boardRef.current;
    if (!board || plant.mapX == null || plant.mapY == null) {
      return;
    }
    const rect = board.getBoundingClientRect();
    const centerX = rect.left + (plant.mapX / 100) * rect.width;
    const centerY = rect.top + (plant.mapY / 100) * rect.height;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDrag({
      kind: "move",
      id: plant.id,
      offsetX: event.clientX - centerX,
      offsetY: event.clientY - centerY,
    });
  }

  function startResize(
    event: React.PointerEvent,
    plant: (typeof local)[number],
  ) {
    if (!editMode || selectedId !== plant.id || pointersRef.current.size > 1) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    movedRef.current = false;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDrag({
      kind: "resize",
      id: plant.id,
      startSize: plant.mapSize ?? DEFAULT_SIZE,
      startY: event.clientY,
    });
  }

  function placeFromTray(plantId: string) {
    if (!editMode) {
      return;
    }
    const next = { mapX: 50, mapY: 50, mapSize: DEFAULT_SIZE };
    setLocal((current) =>
      current.map((plant) =>
        plant.id === plantId ? { ...plant, ...next } : plant,
      ),
    );
    setSelectedId(plantId);
    void persist(plantId, next);
  }

  function removeFromMap(plantId: string) {
    if (!editMode) {
      return;
    }
    setLocal((current) =>
      current.map((plant) =>
        plant.id === plantId
          ? { ...plant, mapX: null, mapY: null, mapSize: null }
          : plant,
      ),
    );
    if (selectedId === plantId) {
      setSelectedId(null);
    }
    void persist(plantId, { mapX: null, mapY: null, mapSize: null });
  }

  function toggleEditMode() {
    setEditMode((value) => {
      if (value) {
        setSelectedId(null);
      } else {
        setNamedId(null);
      }
      return !value;
    });
  }

  function isDesktopPointer() {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function handlePlantActivate(plant: (typeof local)[number]) {
    activateMapPlant(plant, {
      editMode,
      movedRef,
      isDesktopPointer,
      push: (href) => router.push(href),
      namedId,
      lastTapRef,
      setNamedId,
    });
  }

  // Only block page scroll while zoomed or mid-gesture. At 1× allow
  // vertical scroll over the map again (touch-pan-y).
  const blockPageScroll =
    pinching || scale > MIN_ZOOM || drag?.kind === "pan";

  return (
    <div className="flex flex-col">
      <div
        ref={viewportRef}
        className={`relative w-full overflow-hidden border-y border-emerald-900/10 bg-white select-none ${
          blockPageScroll ? "touch-none" : "touch-pan-y"
        }`}
        style={{ aspectRatio: "610 / 1024" }}
        onPointerDown={onPointerDownViewport}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(event) => {
          // Trackpad pinch often sets ctrlKey; mouse: Ctrl/Cmd + wheel.
          if (!(event.ctrlKey || event.metaKey)) {
            return;
          }
          event.preventDefault();
          const factor = event.deltaY > 0 ? 0.9 : 1.1;
          applyZoomAt(scale * factor, event.clientX, event.clientY);
        }}
      >
        <div className="pointer-events-none absolute right-2 top-2 z-40 flex flex-col items-end gap-2">
          <MapControlButton
            label={editMode ? "Listo" : "Ubicar plantas"}
            active={editMode}
            onClick={toggleEditMode}
          >
            {editMode ? <CheckIcon /> : <PinIcon />}
          </MapControlButton>
          {scale > 1 ? (
            <MapControlButton
              label={`Zoom ${scale.toFixed(1)}× · restablecer`}
              onClick={resetZoom}
            >
              <ZoomResetIcon />
            </MapControlButton>
          ) : null}
        </div>

        {editMode ? (
          <p className="pointer-events-none absolute bottom-2 left-2 right-16 z-40 rounded-lg bg-emerald-950/80 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            Tocá una · arrastrá · tamaño
          </p>
        ) : null}

        <div
          ref={boardRef}
          className="absolute inset-0 origin-top-left will-change-transform"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
          }}
        >
          <Image
            src={mapSrc}
            alt="Plano del patio"
            fill
            data-map-bg="1"
            className="pointer-events-none object-contain"
            sizes="(max-width: 768px) 100vw, 512px"
            priority
            draggable={false}
          />

          {placed.map((plant) => {
            const size = plant.mapSize ?? DEFAULT_SIZE;
            const needsCare = plant.careStatus !== "ok";
            const isSelected = editMode && selectedId === plant.id;
            const showName = isSelected || (!editMode && namedId === plant.id);
            const handleScale = 1 / scale;
            return (
              <div
                key={plant.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                  savingId === plant.id ? "opacity-70" : ""
                }`}
                style={{
                  left: `${plant.mapX}%`,
                  top: `${plant.mapY}%`,
                  width: `${size}%`,
                  zIndex: isSelected || showName ? 20 : 1,
                }}
              >
                {showName ? (
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 max-w-[10rem] whitespace-nowrap rounded-lg bg-emerald-950 px-2 py-1 text-center text-xs font-semibold text-white shadow-md"
                    style={{
                      transform: `translateX(-50%) scale(${handleScale})`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    {plant.name}
                  </div>
                ) : null}
                <button
                  type="button"
                  title={plant.name}
                  aria-label={plant.name}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => startMove(event, plant)}
                  onClick={() => handlePlantActivate(plant)}
                  className={`relative aspect-square w-full overflow-hidden rounded-full border-2 shadow-md ${
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-300"
                      : "border-white"
                  } ${editMode ? "touch-none" : ""} ${
                    !editMode && !needsCare ? "opacity-45 grayscale" : ""
                  }`}
                >
                  {plant.coverPhotoPath ? (
                    <Image
                      src={withBasePath(plant.coverPhotoPath)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      draggable={false}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-emerald-100 text-lg">
                      🌿
                    </span>
                  )}
                </button>
                {isSelected ? (
                  <>
                    <button
                      type="button"
                      aria-label="Cambiar tamaño"
                      onPointerDown={(event) => startResize(event, plant)}
                      className="absolute -bottom-1 -right-1 h-5 w-5 touch-none rounded-full border border-emerald-800 bg-amber-300 shadow"
                      style={{
                        transform: `scale(${handleScale})`,
                        transformOrigin: "bottom right",
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Sacar del mapa"
                      onClick={() => removeFromMap(plant.id)}
                      className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow"
                      style={{
                        transform: `scale(${handleScale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {editMode ? (
        <section className="mx-4 mt-4 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-emerald-950">
            Sin ubicar ({unplaced.length})
          </h2>
          <p className="mt-1 text-sm text-emerald-900/70">
            Tocá una para ponerla en el centro. Después arrastrala o cambiá el
            tamaño.
          </p>
          {unplaced.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-900/60">
              Todas las plantas activas ya están en el mapa.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {unplaced.map((plant) => (
                <li key={plant.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => placeFromTray(plant.id)}
                    className="flex w-full min-w-0 flex-col items-center gap-1 overflow-hidden rounded-xl border border-emerald-900/10 bg-emerald-50/80 p-2 text-center hover:bg-emerald-100"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-emerald-100">
                      {plant.coverPhotoPath ? (
                        <Image
                          src={withBasePath(plant.coverPhotoPath)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xl">
                          🌿
                        </span>
                      )}
                    </span>
                    <span className="w-full min-w-0 break-words text-xs font-semibold leading-tight text-emerald-950 [overflow-wrap:anywhere] line-clamp-2">
                      {plant.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
