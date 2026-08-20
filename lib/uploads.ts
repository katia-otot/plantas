import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function getUploadDir() {
  return UPLOAD_DIR;
}

export function getPublicUploadPath(filename: string) {
  return `/api/uploads/${filename}`;
}

export async function saveUploadedFile(file: File): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const extension = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return getPublicUploadPath(filename);
}

export function resolveUploadFilePath(filename: string) {
  const safeName = path.basename(filename);
  return path.join(UPLOAD_DIR, safeName);
}
