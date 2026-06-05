"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitCustomerArtBatch } from "@/app/actions/customer-art";
import { ArtGalleryStrip } from "@/components/panes/art-gallery-strip";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import type { StorefrontImagePin } from "@/lib/image-submission-pins-storefront";

export function ArtSubPane({
  artGroup,
  subHeading,
  chooseButtonLabel,
  submitButtonLabel,
  submitPendingLabel,
  cancelButtonLabel,
  isLoggedIn,
  galleryItems,
  galleryAutoScroll,
  galleryDirection,
  gallerySpeed,
  galleryEnabled,
  pinsBySubmissionId,
  pinAppearance,
}: {
  artGroup: string;
  subHeading: string;
  chooseButtonLabel: string;
  submitButtonLabel: string;
  submitPendingLabel: string;
  cancelButtonLabel: string;
  isLoggedIn: boolean;
  galleryItems: ApprovedArtGalleryItem[];
  galleryEnabled: boolean;
  galleryAutoScroll: boolean;
  galleryDirection: "left" | "right";
  gallerySpeed: number;
  pinsBySubmissionId: Record<string, StorefrontImagePin[]>;
  pinAppearance: ImageSubmissionPinAppearance;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  if (!artGroup.trim()) {
    return (
      <p className="text-center text-sm text-ink/70">
        Art uploads are not configured for this section yet. An admin can set an <strong>Art group</strong> in{" "}
        <Link href="/settings/home" className="font-medium text-lagoon-dark underline">
          Settings → Home
        </Link>
        .
      </p>
    );
  }

  function openFilePicker() {
    setErr(null);
    setPartialErrors([]);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setSelectedFiles(picked);
    setErr(null);
    setMsg(null);
    setPartialErrors([]);
  }

  function clearSelection() {
    setSelectedFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setErr(null);
    setPartialErrors([]);
  }

  function removeFile(index: number) {
    setSelectedFiles((files) => files.filter((_, i) => i !== index));
    setErr(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setPartialErrors([]);
    if (selectedFiles.length === 0) {
      setErr("Choose at least one image file.");
      return;
    }
    const fd = new FormData();
    fd.set("artGroup", artGroup);
    for (const file of selectedFiles) {
      fd.append("file", file);
    }
    startTransition(async () => {
      const r = await submitCustomerArtBatch(fd);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      clearSelection();
      setPartialErrors(r.errors);
      setMsg(
        r.uploadedCount === 1
          ? "Thanks! Your artwork was submitted."
          : `Thanks! ${r.uploadedCount} artworks were submitted.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      {galleryEnabled && galleryItems.length > 0 ? (
        <ArtGalleryStrip
          items={galleryItems}
          autoScroll={galleryAutoScroll}
          direction={galleryDirection}
          speed1to10={gallerySpeed}
          pinsBySubmissionId={pinsBySubmissionId}
          pinAppearance={pinAppearance}
        />
      ) : null}

      <div className="mx-auto max-w-lg text-center">
        {subHeading.trim() ? (
          <p className="text-sm font-medium text-ink/85 sm:text-base">{subHeading}</p>
        ) : null}

        {!isLoggedIn ? (
          <p className="mt-4 text-sm text-ink/75">
            <Link href="/login" className="font-bold text-lagoon-dark underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/register" className="font-bold text-lagoon-dark underline">
              create an account
            </Link>{" "}
            to upload your drawing.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3 text-left">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              disabled={pending}
              onChange={onFileChange}
              className="sr-only"
            />

            {selectedFiles.length === 0 ? (
              <div className="text-center">
                <button type="button" onClick={openFilePicker} disabled={pending} className={btnMainMd}>
                  {chooseButtonLabel}
                </button>
                <p className="mt-2 text-xs text-ink/55">PNG, JPEG, WebP, GIF, or AVIF — max 8MB each.</p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-bold text-ink">
                  Your artwork{selectedFiles.length === 1 ? "" : " (images)"}
                </label>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded border border-palm/20 bg-white p-2 text-sm">
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
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={openFilePicker} disabled={pending} className={btnSecondaryMd}>
                    Add more
                  </button>
                  <button type="submit" disabled={pending} className={`flex-1 ${btnMainMd}`}>
                    {pending ? submitPendingLabel : submitButtonLabel}
                  </button>
                  <button type="button" disabled={pending} onClick={clearSelection} className={btnSecondaryMd}>
                    {cancelButtonLabel}
                  </button>
                </div>
              </>
            )}

            {msg ? <p className="text-sm font-medium text-lagoon-dark">{msg}</p> : null}
            {partialErrors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-coral">
                {partialErrors.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
