const STORAGE_KEY = "lemons-label-upload-library";

export type GuestUploadEntry = { id: string; imageUrl: string; createdAt: string };

export function readGuestUploads(): GuestUploadEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestUploadEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestUploads(entries: GuestUploadEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 80)));
}

export function addGuestUpload(imageUrl: string): GuestUploadEntry {
  const entry: GuestUploadEntry = {
    id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readGuestUploads().filter((e) => e.imageUrl !== imageUrl)];
  writeGuestUploads(next);
  return entry;
}

export function removeGuestUpload(id: string): void {
  writeGuestUploads(readGuestUploads().filter((e) => e.id !== id));
}
