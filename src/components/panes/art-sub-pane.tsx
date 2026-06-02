"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitCustomerArt } from "@/app/actions/customer-art";
import { ArtGalleryStrip } from "@/components/panes/art-gallery-strip";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { ApprovedArtGalleryItem } from "@/lib/customer-art-gallery";

export function ArtSubPane({
  artGroup,
  subHeading,
  isLoggedIn,
  galleryItems,
  galleryAutoScroll,
  galleryDirection,
  gallerySpeed,
  galleryEnabled,
  galleryShowArtistName,
  galleryShowArtGroup,
}: {
  artGroup: string;
  subHeading: string;
  isLoggedIn: boolean;
  galleryItems: ApprovedArtGalleryItem[];
  galleryEnabled: boolean;
  galleryAutoScroll: boolean;
  galleryDirection: "left" | "right";
  gallerySpeed: number;
  galleryShowArtistName: boolean;
  galleryShowArtGroup: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErr(null);
    setMsg(null);
  }

  function clearSelection() {
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setErr(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!selectedFile) {
      setErr("Choose an image file.");
      return;
    }
    const fd = new FormData();
    fd.set("artGroup", artGroup);
    fd.set("file", selectedFile);
    startTransition(async () => {
      const r = await submitCustomerArt(fd);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      clearSelection();
      setMsg("Thanks! Your artwork was submitted.");
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
          showArtistName={galleryShowArtistName}
          showArtGroup={galleryShowArtGroup}
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
            {selectedFile ? (
              <label className="block text-sm font-bold text-ink">Your artwork (image)</label>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              disabled={pending}
              onChange={onFileChange}
              className={
                selectedFile
                  ? "block w-full border-2 border-palm-mid bg-white px-2 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-palm/10 file:px-3 file:py-1 file:text-xs file:font-bold file:text-palm"
                  : "sr-only"
              }
            />

            {!selectedFile ? (
              <div className="text-center">
                <button type="button" onClick={openFilePicker} disabled={pending} className={btnMainMd}>
                  Choose artwork
                </button>
                <p className="mt-2 text-xs text-ink/55">PNG, JPEG, WebP, GIF, or AVIF — max 8MB.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-ink/55">
                  Selected: <span className="font-medium text-ink">{selectedFile.name}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={pending} className={`flex-1 ${btnMainMd}`}>
                    {pending ? "Uploading…" : "Submit artwork"}
                  </button>
                  <button type="button" disabled={pending} onClick={clearSelection} className={btnSecondaryMd}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {msg ? <p className="text-sm font-medium text-lagoon-dark">{msg}</p> : null}
            {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
}
