export const THEATRICAL_VIDEO_MAX_BYTES = 75 * 1024 * 1024;

export const THEATRICAL_VIDEO_ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/** Vercel serverless request bodies are capped near 4.5MB — larger files must use Blob client upload. */
export const THEATRICAL_VIDEO_SERVER_ACTION_SAFE_BYTES = 4 * 1024 * 1024;

export function safeTheatricalVideoBasename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "video";
}

export function theatricalVideoExtForMime(mime: string): string {
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return "mp4";
}

export function isValidTheatricalVideoBlobPath(pathname: string): boolean {
  return /^uploads\/theme\/[a-zA-Z0-9._-]+\.(mp4|webm|mov)$/.test(pathname);
}

export function theatricalVideoBlobPathname(file: File): string {
  const base = safeTheatricalVideoBasename(file.name).replace(/\.[^.]+$/, "");
  const ext = theatricalVideoExtForMime(file.type);
  return `uploads/theme/${crypto.randomUUID()}-${base || "video"}.${ext}`;
}

export function validateTheatricalVideoFile(file: File): string | null {
  if (!THEATRICAL_VIDEO_ALLOWED_TYPES.has(file.type)) {
    return "Use MP4, WebM, or MOV.";
  }
  if (file.size > THEATRICAL_VIDEO_MAX_BYTES) {
    return "Video must be 75MB or smaller.";
  }
  if (file.size <= 0) {
    return "Choose a video file.";
  }
  return null;
}
