"use client";

import Image from "next/image";
import Link from "next/link";
import { withBasePath } from "@/lib/base-path";

export type BirdCardProps = {
  id: string;
  name: string;
  notes?: string | null;
  coverPhotoPath?: string | null;
};

export function BirdCard({ id, name, notes, coverPhotoPath }: BirdCardProps) {
  return (
    <article className="relative flex overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm transition hover:border-emerald-300">
      <Link
        href={`/pajaros/${id}`}
        className="absolute inset-0"
        aria-label={`Ver ${name}`}
      />
      <div className="relative z-0 w-24 shrink-0 self-stretch min-h-[5.5rem] pointer-events-none bg-emerald-50">
        {coverPhotoPath ? (
          <Image
            src={withBasePath(coverPhotoPath)}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full min-h-[5.5rem] items-center justify-center text-3xl">
            🐦
          </div>
        )}
      </div>
      <div className="relative z-0 min-w-0 flex-1 p-3 pointer-events-none">
        <h3 className="truncate text-base font-semibold text-emerald-950">
          {name}
        </h3>
        {notes ? (
          <p className="mt-1 line-clamp-2 text-sm text-emerald-900/70">
            {notes}
          </p>
        ) : (
          <p className="mt-1 text-sm text-emerald-900/50">Sin descripción</p>
        )}
      </div>
    </article>
  );
}
