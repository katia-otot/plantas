"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActionIcon, type ActionIconName } from "@/components/ActionIcon";

const links: Array<{ href: string; label: string; icon: ActionIconName }> = [
  { href: "/", label: "Hoy", icon: "agenda" },
  { href: "/mapa", label: "Mapa", icon: "mapa-plantas" },
  { href: "/plants", label: "Plantas", icon: "planta" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              title={link.label}
              className={`flex flex-1 items-center justify-center py-3 transition ${
                active
                  ? "bg-emerald-100 text-emerald-950"
                  : "text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              <span
                className={`rounded-2xl px-3 py-1 ${
                  active ? "bg-emerald-500/20 ring-2 ring-emerald-500/40" : ""
                }`}
              >
                <ActionIcon name={link.icon} size={44} alt="" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
