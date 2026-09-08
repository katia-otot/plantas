import { ActionIcon } from "@/components/ActionIcon";
import { MapFloorPlanControls } from "@/components/MapFloorPlanControls";
import { PatioMapBoard, type MapPlant } from "@/components/PatioMapBoard";
import { withBasePath } from "@/lib/base-path";
import { getMapImagePath } from "@/lib/map-image";
import { getGardenSettings, listActivePlants } from "@/lib/plants";
import { getPlantDueTasks, getWorstStatus } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function PatioMapPage() {
  const [plants, gardenSettings, mapImage] = await Promise.all([
    listActivePlants(),
    getGardenSettings(),
    getMapImagePath(),
  ]);

  const mapPlants: MapPlant[] = plants.map((plant) => {
    const tasks = getPlantDueTasks(
      plant,
      new Date(),
      gardenSettings.lastRainAt,
      gardenSettings.seasonOverride,
    );
    return {
      id: plant.id,
      name: plant.name,
      coverPhotoPath: plant.coverPhotoPath,
      mapX: plant.mapX,
      mapY: plant.mapY,
      mapSize: plant.mapSize,
      careStatus: getWorstStatus(tasks),
    };
  });

  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-lg px-4 pt-4 pb-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Patio
        </p>
        <div className="mt-1 flex items-center gap-3">
          <ActionIcon name="mapa-plantas" size={52} alt="" />
          <h1 className="text-3xl font-bold text-emerald-950">Mapa</h1>
        </div>
      </header>

      <MapFloorPlanControls hasPlan={mapImage.hasPlan} />

      <PatioMapBoard
        plants={mapPlants}
        mapSrc={mapImage.mapSrc ? withBasePath(mapImage.mapSrc) : null}
      />
    </main>
  );
}
