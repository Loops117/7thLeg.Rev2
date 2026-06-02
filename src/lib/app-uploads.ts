import { del, put } from "@vercel/blob";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

export function isRemoteBlobStorage(): boolean {
  return Boolean(BLOB_TOKEN);
}

/**
 * With `BLOB_READ_WRITE_TOKEN` (Vercel Blob), returns an `https://` URL; otherwise
 * writes under `public/` and returns `/uploads/...`. `key` is like `uploads/products/id/file.jpg`.
 */
const BLOB_HELP =
  "Set BLOB_READ_WRITE_TOKEN in the Vercel project (Storage → Blob → read-write token → Environment Variables).";

export async function putUploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const clean = key.replace(/^\/+/, "");
  if (BLOB_TOKEN) {
    const { url } = await put(clean, body, {
      access: "public",
      token: BLOB_TOKEN,
      contentType,
      addRandomSuffix: false,
    });
    return url;
  }
  if (process.env.VERCEL) {
    throw new Error(
      `Image storage is not configured for this deployment. ${BLOB_HELP} Without it, the server cannot write to disk.`,
    );
  }
  const full = path.join(process.cwd(), "public", clean);
  try {
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "EROFS" || err.code === "EACCES" || err.code === "EPERM") {
      throw new Error(`Could not write upload (${err.code}). In production, use Vercel Blob. ${BLOB_HELP}`);
    }
    throw e;
  }
  return `/${clean}`;
}

export async function deleteUploadByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (url.startsWith("https://") || url.startsWith("http://")) {
    if (BLOB_TOKEN) {
      await del(url, { token: BLOB_TOKEN }).catch(() => {});
    }
    return;
  }
  if (url.startsWith("/uploads/")) {
    const full = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    await unlink(full).catch(() => {});
  }
}

export function uploadKeyFromPublicUrl(url: string): string | null {
  const u = url.trim();
  if (u.startsWith("/uploads/")) {
    return u.slice(1);
  }
  try {
    const parsed = new URL(u);
    const p = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    if (p.startsWith("uploads/")) return p;
  } catch {
    return null;
  }
  return null;
}

export function watermarkedObjectKeyFromOriginalKey(originalKey: string): string {
  const lastSlash = originalKey.lastIndexOf("/");
  const dir = lastSlash >= 0 ? originalKey.slice(0, lastSlash + 1) : "";
  const file = lastSlash >= 0 ? originalKey.slice(lastSlash + 1) : originalKey;
  const dot = file.lastIndexOf(".");
  const base = dot >= 0 ? file.slice(0, dot) : file;
  return `${dir}${base}-wm.jpg`;
}
