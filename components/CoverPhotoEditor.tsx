"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";
import { uploadPhotos } from "@/lib/client-api";

type Props = {
  name: string;
  coverPhotoPath: string | null;
  /** e.g. `/api/plants/${id}/cover` or `/api/birds/${id}/cover` */
  savePath: string;
  emptyFallback?: ReactNode;
};

function GalleryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
      <path
        d="M4.5 17.5 9 13l3 2.5 3.5-4 4 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M9 7.5 10.2 5.5h3.6L15 7.5h3.5A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5V9A1.5 1.5 0 0 1 5.5 7.5H9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function CoverPhotoEditor({
  name,
  coverPhotoPath,
  savePath,
  emptyFallback = <span className="text-6xl">🌿</span>,
}: Props) {
  const router = useRouter();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(coverPhotoPath);
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen]);

  async function persist(path: string) {
    const response = await fetch(withBasePath(savePath), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverPhotoPath: path }),
    });
    if (!response.ok) {
      throw new Error("No se pudo guardar la foto");
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || busy) {
      return;
    }

    try {
      setBusy(true);
      const [path] = await uploadPhotos([files[0]!]);
      await persist(path);
      setPreview(path);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("No se pudo cambiar la foto de portada");
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    input: HTMLInputElement | null,
  ) {
    void handleFiles(event.target.files);
    if (input) {
      input.value = "";
    }
  }

  const overlayBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-50";

  return (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-emerald-50">
        {preview ? (
          <button
            type="button"
            aria-label={`Ver foto completa de ${name}`}
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0"
          >
            <Image
              src={withBasePath(preview)}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
              priority
            />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center">
            {emptyFallback}
          </div>
        )}

        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            type="button"
            disabled={busy}
            aria-label="Cambiar foto"
            title="Cambiar foto"
            onClick={() => galleryRef.current?.click()}
            className={overlayBtn}
          >
            <GalleryIcon />
          </button>
          <button
            type="button"
            disabled={busy}
            aria-label="Sacar foto"
            title="Sacar foto"
            onClick={() => cameraRef.current?.click()}
            className={overlayBtn}
          >
            <CameraIcon />
          </button>
        </div>

        {busy ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-950/35 text-sm font-semibold text-white">
            Guardando…
          </div>
        ) : null}

        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => onFileChange(event, galleryRef.current)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => onFileChange(event, cameraRef.current)}
        />
      </div>

      {lightboxOpen && preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white backdrop-blur-sm hover:bg-white/25"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          <div
            className="relative max-h-[min(92vh,900px)] max-w-[min(96vw,900px)]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Plain img so the full file shows without forced crop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={withBasePath(preview)}
              alt={name}
              className="max-h-[min(92vh,900px)] max-w-[min(96vw,900px)] object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
