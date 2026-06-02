"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { hideCustomerArtUpload } from "@/app/actions/customer-art";
import { btnImportantMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { CustomerMyArtUploadRow } from "@/lib/customer-art";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function RemoveUploadConfirmDialog({
  open,
  onCancel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-upload-dialog-title"
        className="w-full max-w-md rounded-xl border-2 border-palm bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-palm/15 px-4 py-3">
          <h2 id="remove-upload-dialog-title" className="text-sm font-black text-palm">
            Remove this upload?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink/70">
            This image will be removed from your account and will no longer appear in any slideshows or community
            galleries on the site. Your upload record is kept for store records and any coupons tied to it, but it will
            look deleted to you.
          </p>
        </div>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={pending} className={btnSecondaryMd}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={btnImportantMd}>
            {pending ? "Removing…" : "Remove upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerMyUploadsGallery({ initialUploads }: { initialUploads: CustomerMyArtUploadRow[] }) {
  const router = useRouter();
  const [uploads, setUploads] = useState(initialUploads);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);

  const viewer = uploads.find((u) => u.id === viewerId) ?? null;

  function confirmRemove() {
    if (!confirmId) return;
    setErr(null);
    startTransition(async () => {
      const r = await hideCustomerArtUpload(confirmId);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setUploads((list) => list.filter((u) => u.id !== confirmId));
      if (viewerId === confirmId) setViewerId(null);
      setConfirmId(null);
      router.refresh();
    });
  }

  if (uploads.length === 0) {
    return (
      <p className="mt-6 max-w-xl text-ink/80">
        You don&apos;t have any uploads right now. Submit artwork from the home page when an Art Sub section is available.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {uploads.map((item) => (
          <figure
            key={item.id}
            className="overflow-hidden rounded-lg border-2 border-palm/20 bg-white/80 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setViewerId(item.id)}
              className="block w-full cursor-zoom-in bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon-dark"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" className="aspect-[4/5] w-full object-contain p-2" loading="lazy" />
            </button>
            <figcaption className="space-y-2 border-t border-palm/10 px-3 py-2">
              <p className="text-xs text-ink/70">{formatDate(item.createdAt)}</p>
              <p className="truncate text-xs font-bold text-ink">{item.artGroup}</p>
              <p className="text-[11px] text-ink/55">
                {item.approved ? "Approved for community gallery" : "Pending review"}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmId(item.id)}
                className="text-xs font-bold text-coral underline hover:no-underline disabled:opacity-50"
              >
                Remove
              </button>
            </figcaption>
          </figure>
        ))}
      </div>

      {viewer ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/55 p-2 sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setViewerId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-palm bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-palm/15 px-4 py-3">
              <div>
                <p className="text-sm font-black text-palm">{viewer.artGroup}</p>
                <p className="text-xs text-ink/65">{formatDate(viewer.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setViewerId(null)} className={btnSecondaryMd}>
                Close
              </button>
            </div>
            <div className="overflow-auto bg-zinc-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewer.imageUrl}
                alt="Your uploaded artwork"
                className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      <RemoveUploadConfirmDialog
        open={confirmId != null}
        pending={pending}
        onCancel={() => {
          if (!pending) setConfirmId(null);
        }}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
