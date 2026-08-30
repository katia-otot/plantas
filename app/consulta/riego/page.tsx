import { WaterIntervalGroups } from "@/components/WaterIntervalGroups";
import { resolveGardenId } from "@/lib/garden-access";
import { estacionParamToSeason } from "@/lib/water-consulta";
import { prisma } from "@/lib/db";
import { getGardenSettings } from "@/lib/plants";
import { getEffectiveSeason } from "@/lib/schedule";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ estacion?: string | string[] }>;
};

export default async function WaterGuidePage({ searchParams }: PageProps) {
  const gardenId = await resolveGardenId();
  const [plants, gardenSettings, params] = await Promise.all([
    prisma.plant.findMany({
      where: { gardenId, status: "alta" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        quantity: true,
        coverPhotoPath: true,
        waterSummerDays: true,
        waterWinterDays: true,
        isIndoor: true,
      },
    }),
    getGardenSettings(gardenId),
    searchParams,
  ]);

  const season =
    estacionParamToSeason(params.estacion) ??
    getEffectiveSeason(new Date(), gardenSettings.seasonOverride);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6">
      <WaterIntervalGroups plants={plants} season={season} />
    </main>
  );
}
