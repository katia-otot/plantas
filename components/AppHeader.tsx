import { AppMenu } from "@/components/AppMenu";
import { getGardenSettings } from "@/lib/plants";
import { getEffectiveSeason, getSeason } from "@/lib/schedule";

export async function AppHeader() {
  const today = new Date();
  const gardenSettings = await getGardenSettings();
  const calendarSeason = getSeason(today);
  const effectiveSeason = getEffectiveSeason(
    today,
    gardenSettings.seasonOverride,
  );

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-[#edf7f0]/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
        <p className="text-sm font-semibold tracking-wide text-emerald-800">
          Plantas del patio
        </p>
        <AppMenu
          effectiveSeason={effectiveSeason}
          calendarSeason={calendarSeason}
          seasonOverride={gardenSettings.seasonOverride}
        />
      </div>
    </header>
  );
}
