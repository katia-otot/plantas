export type MapPlantRef = {
  id: string;
};

export type ActivateMapPlantOptions = {
  editMode: boolean;
  movedRef: { current: boolean };
  isDesktopPointer: () => boolean;
  push: (href: string) => void;
  namedId: string | null;
  lastTapRef: { current: { id: string; at: number } | null };
  setNamedId: (id: string | null) => void;
  now?: () => number;
};

/** Double-tap window for opening a plant on touch devices (ms). */
export const MAP_PLANT_DOUBLE_TAP_MS = 650;

export function activateMapPlant(
  plant: MapPlantRef,
  options: ActivateMapPlantOptions,
) {
  const {
    editMode,
    movedRef,
    isDesktopPointer,
    push,
    namedId,
    lastTapRef,
    setNamedId,
    now = Date.now,
  } = options;

  if (editMode || movedRef.current) {
    return;
  }

  if (isDesktopPointer()) {
    push(`/plants/${plant.id}`);
    return;
  }

  const timestamp = now();
  const last = lastTapRef.current;
  if (
    namedId === plant.id &&
    last?.id === plant.id &&
    timestamp - last.at < MAP_PLANT_DOUBLE_TAP_MS
  ) {
    lastTapRef.current = null;
    setNamedId(null);
    push(`/plants/${plant.id}`);
    return;
  }

  lastTapRef.current = { id: plant.id, at: timestamp };
  setNamedId(plant.id);
}
