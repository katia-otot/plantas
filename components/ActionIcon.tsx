import {
  GARDEN_ICON_LABELS,
  gardenIconSrc,
  type GardenIconId,
} from "@/lib/garden-icons";

export type ActionIconName = GardenIconId;

interface ActionIconProps {
  name: ActionIconName;
  className?: string;
  size?: number;
  alt?: string;
}

/** Animated garden SVG icon. Prefer 40–48px; 56–64px on featured cards. */
export function ActionIcon({
  name,
  className = "",
  size = 48,
  alt,
}: ActionIconProps) {
  const label = alt ?? GARDEN_ICON_LABELS[name];
  return (
    // SMIL animations need a plain <img>, not next/image
    <img
      src={gardenIconSrc(name)}
      alt={alt === "" ? "" : label}
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`.trim()}
      aria-hidden={alt === "" ? true : undefined}
      draggable={false}
    />
  );
}
