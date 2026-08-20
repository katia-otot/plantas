"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { withBasePath } from "@/lib/base-path";
import { EVENT_LABELS, type CareEventType } from "@/lib/types";

const INITIAL_VISIBLE = 3;

interface TimelineEvent {
  id: string;
  type: string;
  happenedAt: Date | string;
  notes?: string | null;
  photos: Array<{ id: string; path: string; caption?: string | null }>;
}

function TimelineEntry({ event }: { event: TimelineEvent }) {
  return (
    <article className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-emerald-950">
          {EVENT_LABELS[event.type as CareEventType] ?? event.type}
        </h3>
        <time className="text-xs text-emerald-900/60">
          {formatDateTime(event.happenedAt)}
        </time>
      </div>

      {event.notes && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900/80">
          {event.notes}
        </p>
      )}

      {event.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {event.photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-emerald-50"
            >
              <Image
                    src={withBasePath(photo.path)}
                alt={photo.caption ?? "Foto del historial"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 200px"
              />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function EventTimeline({ events }: { events: TimelineEvent[] }) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-emerald-900/15 bg-white p-6 text-center text-sm text-emerald-900/70">
        Todavía no hay entradas en el historial.
      </p>
    );
  }

  const hasMore = events.length > INITIAL_VISIBLE;
  const visibleEvents = expanded ? events : events.slice(0, INITIAL_VISIBLE);
  const hiddenCount = events.length - INITIAL_VISIBLE;

  return (
    <div className="space-y-4">
      {visibleEvents.map((event) => (
        <TimelineEntry key={event.id} event={event} />
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full rounded-xl border border-emerald-900/10 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          {expanded
            ? "Ver menos"
            : `Ver más (${hiddenCount} ${hiddenCount === 1 ? "entrada" : "entradas"})`}
        </button>
      )}
    </div>
  );
}
