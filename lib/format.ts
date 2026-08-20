export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "—";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toInputDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}
