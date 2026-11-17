/** Case/accent-insensitive plant name match for list filters. */
export function matchesPlantSearch(
  name: string,
  query: string | null | undefined,
): boolean {
  const q = query?.trim();
  if (!q) {
    return true;
  }

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  return normalize(name).includes(normalize(q));
}
