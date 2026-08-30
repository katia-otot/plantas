/** Merge plant `notes` into `observations` without dropping either side. */
export function mergeNotesIntoObservations(
  observations?: string | null,
  notes?: string | null,
): string | null {
  const obs = observations?.trim() || "";
  const note = notes?.trim() || "";
  if (!note) {
    return obs || null;
  }
  if (!obs) {
    return note;
  }
  if (obs.includes(note)) {
    return obs;
  }
  if (note.includes(obs)) {
    return note;
  }
  return `${obs}\n\n${note}`;
}
