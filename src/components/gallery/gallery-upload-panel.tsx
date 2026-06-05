"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitCustomerArtBatch } from "@/app/actions/customer-art";
import { GALLERY_PAGE_ART_GROUP } from "@/lib/customer-art";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";

type Phase = "pick" | "done";

export function GalleryUploadPanel({
  open,
  onClose,
  isLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("pick");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);

  if (!open) return null;

  function resetPicker() {
    setSelectedFiles([]);
    setErr(null);
    setPartialErrors([]);
    setUploadedCount(0);
    setPhase("pick");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    resetPicker();
    onClose();
  }

  function openFilePicker() {
    setErr(null);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setSelectedFiles(picked);
    setErr(null);
    setPartialErrors([]);
  }

  function removeFile(index: number) {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
    setErr(null);
  }

  function onUpload() {
    setErr(null);
    setPartialErrors([]);
    if (selectedFiles.length === 0) {
      setErr("Choose at least one image.");
      return;
    }

    const fd = new FormData();
    fd.set("artGroup", GALLERY_PAGE_ART_GROUP);
    for (const file of selectedFiles) {
      fd.append("file", file);
    }

    startTransition(async () => {
      const result = await submitCustomerArtBatch(fd);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setUploadedCount(result.uploadedCount);
      setPartialErrors(result.errors);
      setSelectedFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      setPhase("done");
      router.refresh();
    });
  }

  return (
    <div
      className="gallery-viewer-scrim fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center sm:p-6"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gallery-upload-panel-title"
        className="gallery-viewer-panel w-full max-w-md rounded-xl border-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="gallery-upload-panel-title" className="text-lg font-black text-palm">
          Upload images
        </h2>

        {!isLoggedIn ? (
          <p className="mt-4 text-sm text-ink/80">
            <Link href="/login" className="font-bold text-lagoon-dark underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="font-bold text-lagoon-dark underline">
              create an account
            </Link>{" "}
            to share your photos with the gallery.
          </p>
        ) : phase === "done" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-lagoon-dark">
              {uploadedCount === 1
                ? "Thanks! Your image was submitted."
                : `Thanks! ${uploadedCount} images were submitted.`}{" "}
              We&apos;ll review them before they appear in the gallery.
            </p>
            {partialErrors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-coral">
                {partialErrors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={resetPicker} className={btnMainMd}>
                Upload more
              </button>
              <button type="button" onClick={handleClose} className={btnSecondaryMd}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              disabled={pending}
              onChange={onFileChange}
              className="sr-only"
            />
            <button type="button" onClick={openFilePicker} disabled={pending} className={`w-full ${btnSecondaryMd}`}>
              Choose images
            </button>
            <p className="text-xs text-ink/60">PNG, JPEG, WebP, GIF, or AVIF — max 8MB each.</p>

            {selectedFiles.length > 0 ? (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-palm/20 bg-surf/30 p-2 text-sm">
                {selectedFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{file.name}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeFile(index)}
                      className="shrink-0 text-xs font-bold text-coral underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onUpload}
                disabled={pending || selectedFiles.length === 0}
                className={`flex-1 ${btnMainMd}`}
              >
                {pending ? "Uploading…" : "Upload"}
              </button>
              <button type="button" disabled={pending} onClick={handleClose} className={btnSecondaryMd}>
                Cancel
              </button>
            </div>

            {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
          </div>
        )}

        {isLoggedIn && phase !== "done" ? (
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 text-xs font-bold text-ink/60 underline"
          >
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
