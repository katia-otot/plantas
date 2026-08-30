function initialsFrom(label: string): string {
  const parts = label
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function UserAccountSummary({
  name,
  email,
  image,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}) {
  const displayName = name?.trim() || email?.trim() || "Cuenta";
  const secondary = name?.trim() && email?.trim() ? email.trim() : null;
  const initials = initialsFrom(displayName);

  return (
    <div className="flex items-center gap-3">
      {image ? (
        // External Google avatar URL; plain img avoids next/image remote config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-emerald-900/10"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-900/10"
        >
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-emerald-950">
          {displayName}
        </p>
        {secondary ? (
          <p className="truncate text-xs text-emerald-900/70">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}
