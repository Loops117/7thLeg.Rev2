import { upload } from "@vercel/blob/client";
import { uploadThemeDecorVideo } from "@/app/actions/theme-admin";
import {
  THEATRICAL_VIDEO_SERVER_ACTION_SAFE_BYTES,
  theatricalVideoBlobPathname,
  validateTheatricalVideoFile,
} from "@/lib/theatrical-video-upload";

export type TheatricalVideoUploadResult = { ok: true; url: string } | { ok: false; error: string };

async function uploadTheatricalVideoViaBlob(file: File): Promise<TheatricalVideoUploadResult> {
  const pathname = theatricalVideoBlobPathname(file);
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/settings/theatrical-video-upload",
    contentType: file.type,
  });
  return { ok: true, url: blob.url };
}

async function uploadTheatricalVideoViaServerAction(file: File): Promise<TheatricalVideoUploadResult> {
  const fd = new FormData();
  fd.set("file", file);
  return uploadThemeDecorVideo(fd);
}

/**
 * Uploads theatrical pane videos. On Vercel, files over ~4.5MB must go directly to Blob
 * (server actions hit a platform body-size limit and return HTTP 413).
 */
export async function uploadTheatricalPaneVideo(file: File): Promise<TheatricalVideoUploadResult> {
  const validationError = validateTheatricalVideoFile(file);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const needsBlobClient = file.size > THEATRICAL_VIDEO_SERVER_ACTION_SAFE_BYTES;

  if (needsBlobClient) {
    try {
      return await uploadTheatricalVideoViaBlob(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      return {
        ok: false,
        error:
          message.includes("503") || message.toLowerCase().includes("not configured")
            ? "Large video uploads require Vercel Blob storage on this project (BLOB_READ_WRITE_TOKEN)."
            : message,
      };
    }
  }

  try {
    return await uploadTheatricalVideoViaBlob(file);
  } catch {
    return uploadTheatricalVideoViaServerAction(file);
  }
}
