import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { PLANT_PHOTO_MAX_EDGE } from "@/lib/photo-size";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function getUploadDir() {
  return UPLOAD_DIR;
}

export function getPublicUploadPath(filename: string) {
  return `/api/uploads/${filename}`;
}

export async function saveUploadedFile(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.jpg`;
  const input = Buffer.from(await file.arrayBuffer());

  // Keep the full photo — only shrink huge images. Hoy crops with CSS.
  const processed = await sharp(input)
    .rotate()
    .resize({
      width: PLANT_PHOTO_MAX_EDGE,
      height: PLANT_PHOTO_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  await writeFile(path.join(UPLOAD_DIR, filename), processed);

  return getPublicUploadPath(filename);
}

export function resolveUploadFilePath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(UPLOAD_DIR, safeName);
}
