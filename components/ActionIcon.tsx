import Image from "next/image";
import { withBasePath } from "@/lib/base-path";

export type ActionIconName =
  | "water-leaf"
  | "supply-bag"
  | "prune"
  | "inspect"
  | "flask-leaf"
  | "cupped-hands"
  | "water-cycle"
  | "checklist"
  | "hand-sprout"
  | "potted";

interface ActionIconProps {
  name: ActionIconName;
  className?: string;
  /** Invert to white for dark colored buttons */
  invert?: boolean;
  size?: number;
}

export function ActionIcon({
  name,
  className = "",
  invert = true,
  size = 22,
}: ActionIconProps) {
  return (
    <Image
      src={withBasePath(`/icons/${name}.png`)}
      alt=""
      width={size}
      height={size}
      className={`${invert ? "brightness-0 invert" : ""} ${className}`}
      aria-hidden
    />
  );
}
