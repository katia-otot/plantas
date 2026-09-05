/** Reverse geocode lat/lon → short place label (Nominatim / OSM). */

export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("zoom", "10");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AnthosPlantas/1.0 (local garden app; contact local)",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      name?: string;
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        city_district?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address ?? {};
    const place =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.city_district ||
      address.county ||
      data.name ||
      null;

    if (!place) {
      return null;
    }

    const region = address.state;
    if (region && region !== place) {
      return `${place}, ${region}`;
    }
    return place;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
