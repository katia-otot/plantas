"use client";

import { useRef } from "react";

interface PhotoPickerButtonsProps {
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
  galleryLabel?: string;
  cameraLabel?: string;
}

export function PhotoPickerButtons({
  disabled = false,
  multiple = false,
  onFiles,
  galleryLabel = "Galería",
  cameraLabel = "Cámara",
}: PhotoPickerButtonsProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
    input: HTMLInputElement | null,
  ) {
    onFiles(event.target.files);
    if (input) {
      input.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => galleryRef.current?.click()}
        className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
      >
        {galleryLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
      >
        {cameraLabel}
      </button>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => handleChange(event, galleryRef.current)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleChange(event, cameraRef.current)}
      />
    </div>
  );
}
