import Link from "next/link";

const links = [
  { href: "/", label: "Hoy" },
  { href: "/plants", label: "Plantas" },
];

export function NavBar() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-emerald-900/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-1 items-center justify-center py-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
