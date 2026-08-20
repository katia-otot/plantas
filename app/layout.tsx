import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plantas del patio",
  description: "Control de riego, cuidados e historial de plantas del patio",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f4a2f",
};

// SQLite-backed pages must not be prerendered at build time.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full bg-[#edf7f0] text-emerald-950 antialiased">
        <div className="flex min-h-full flex-col">
          <div className="flex-1">{children}</div>
          <NavBar />
        </div>
      </body>
    </html>
  );
}
