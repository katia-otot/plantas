import { AppMenu } from "@/components/AppMenu";
import { auth } from "@/auth";
import { getGardenSettings } from "@/lib/plants";
import { getEffectiveSeason, getSeason } from "@/lib/schedule";

export async function AppHeader() {
  const today = new Date();
  const [gardenSettings, session] = await Promise.all([
    getGardenSettings(),
    auth(),
  ]);
  const calendarSeason = getSeason(today);
  const effectiveSeason = getEffectiveSeason(
    today,
    gardenSettings.seasonOverride,
  );
  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-[#edf7f0]">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
        <p className="text-sm font-semibold tracking-wide text-emerald-800">
          Anthos
        </p>
        <AppMenu
          effectiveSeason={effectiveSeason}
          calendarSeason={calendarSeason}
          seasonOverride={gardenSettings.seasonOverride}
          user={user}
        />
      </div>
    </header>
  );
}
