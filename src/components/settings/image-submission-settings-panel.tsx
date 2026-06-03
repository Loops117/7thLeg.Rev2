"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SettingsCollapsibleSection } from "@/components/settings/settings-collapsible-section";
import { useRouter } from "next/navigation";
import {
  clearImageSubmissionPinCustomImage,
  updateImageSubmissionApprovalPoints,
  updateImageSubmissionPinAppearance,
  uploadImageSubmissionPinCustomImage,
} from "@/app/actions/image-submission-settings";
import { SubmissionPinMarker } from "@/components/gallery/submission-pin-marker";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import { pinMarkerUsesCustomImage } from "@/lib/image-submission-pin-appearance-shared";

export function ImageSubmissionSettingsPanel({
  initialApprovalPoints,
  initialPinAppearance,
}: {
  initialApprovalPoints: number;
  initialPinAppearance: ImageSubmissionPinAppearance;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [approvalPoints, setApprovalPoints] = useState(String(initialApprovalPoints));
  const [savedApprovalPoints, setSavedApprovalPoints] = useState(initialApprovalPoints);
  const [pin, setPin] = useState<ImageSubmissionPinAppearance>(initialPinAppearance);

  useEffect(() => {
    setSavedApprovalPoints(initialApprovalPoints);
    setApprovalPoints(String(initialApprovalPoints));
  }, [initialApprovalPoints]);

  useEffect(() => {
    setPin(initialPinAppearance);
  }, [initialPinAppearance]);

  function saveApprovalPoints() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateImageSubmissionApprovalPoints(Number(approvalPoints));
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      const pts = Math.max(0, Math.min(10_000, Math.floor(Number(approvalPoints) || 0)));
      setSavedApprovalPoints(pts);
      setMsg("Approval points saved.");
      router.refresh();
    });
  }

  function savePinAppearance() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateImageSubmissionPinAppearance(pin);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Pin style saved. All gallery and submission pins will use these settings.");
      router.refresh();
    });
  }

  function onPinFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadImageSubmissionPinCustomImage(fd);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setPin((p) => ({ ...p, customImageUrl: r.url }));
      setMsg("Custom pin image uploaded and applied.");
      router.refresh();
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function removeCustomPin() {
    setMsg(null);
    startTransition(async () => {
      const r = await clearImageSubmissionPinCustomImage();
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setPin((p) => ({ ...p, customImageUrl: "" }));
      setMsg("Custom pin removed. Using dot color below.");
      router.refresh();
    });
  }

  const pinTrailing = (
    <div className="relative shrink-0" style={{ width: pin.sizePx, height: pin.sizePx }} aria-hidden>
      <SubmissionPinMarker
        appearance={pin}
        position={{ left: "50%", top: "50%" }}
        interactive={false}
      />
    </div>
  );

  const approvalTrailing = (
    <span className="text-sm font-bold tabular-nums text-palm">
      {savedApprovalPoints} {savedApprovalPoints === 1 ? "pt" : "pts"} / approval
    </span>
  );

  return (
    <div className="mb-8 space-y-4">
      <SettingsCollapsibleSection title="Pin appearance" trailing={pinTrailing}>
        <p className="max-w-2xl text-sm text-ink/80">
          These settings apply to <strong>every</strong> product pin on the gallery and in submission review. Pins only
          store position and product links — the look comes from here.
        </p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2 rounded border border-palm/25 bg-zinc-100 px-8 py-10">
            <span className="text-xs font-bold uppercase tracking-wide text-ink/55">Preview</span>
            <div className="relative h-24 w-24">
              <SubmissionPinMarker
                appearance={pin}
                position={{ left: "50%", top: "50%" }}
                interactive={false}
                label="Preview"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-ink">
                Dot size (px)
                <input
                  type="number"
                  min={8}
                  max={64}
                  value={pin.sizePx}
                  onChange={(e) => setPin((p) => ({ ...p, sizePx: Number(e.target.value) }))}
                  className="mt-1 block w-full border-2 border-palm-mid px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Border thickness (px)
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={pin.borderWidthPx}
                  onChange={(e) => setPin((p) => ({ ...p, borderWidthPx: Number(e.target.value) }))}
                  className="mt-1 block w-full border-2 border-palm-mid px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Dot color
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={pin.fillColor}
                    onChange={(e) => setPin((p) => ({ ...p, fillColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer border-2 border-palm-mid"
                    disabled={pinMarkerUsesCustomImage(pin)}
                  />
                  <input
                    type="text"
                    value={pin.fillColor}
                    onChange={(e) => setPin((p) => ({ ...p, fillColor: e.target.value }))}
                    className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                    disabled={pinMarkerUsesCustomImage(pin)}
                  />
                </div>
                {pinMarkerUsesCustomImage(pin) ? (
                  <span className="mt-1 block text-xs text-ink/55">Hidden while a custom image is set.</span>
                ) : null}
              </label>
              <label className="block text-sm font-bold text-ink">
                Border color
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={pin.borderColor}
                    onChange={(e) => setPin((p) => ({ ...p, borderColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer border-2 border-palm-mid"
                  />
                  <input
                    type="text"
                    value={pin.borderColor}
                    onChange={(e) => setPin((p) => ({ ...p, borderColor: e.target.value }))}
                    className="min-w-0 flex-1 border-2 border-palm-mid px-2 py-2 font-mono text-sm"
                  />
                </div>
              </label>
            </div>

            <div className="rounded border border-palm/20 bg-white/80 p-4">
              <p className="text-sm font-bold text-palm">Custom pin image (optional)</p>
              <p className="mt-1 text-xs text-ink/65">
                Replaces the colored dot. PNG with transparency works best. Max 512KB.
              </p>
              {pin.customImageUrl ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pin.customImageUrl} alt="" className="h-12 w-12 object-contain" />
                  <button type="button" disabled={pending} onClick={removeCustomPin} className={btnSecondaryMd}>
                    Remove custom image
                  </button>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="text-sm" onChange={onPinFileChange} />
              </div>
            </div>

            <button type="button" disabled={pending} onClick={savePinAppearance} className={btnMainMd}>
              Save pin style
            </button>
          </div>
        </div>
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection title="Approval rewards" trailing={approvalTrailing}>
        <p className="max-w-2xl text-sm text-ink/80">
          Whole loyalty points credited once when you first approve an image for the gallery. Set to <strong>0</strong> to
          disable.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-bold text-ink">
            Points per approval
            <input
              type="number"
              min={0}
              max={10000}
              value={approvalPoints}
              onChange={(e) => setApprovalPoints(e.target.value)}
              className="mt-1 block w-32 border-2 border-palm-mid px-3 py-2 text-sm"
            />
          </label>
          <button type="button" disabled={pending} onClick={saveApprovalPoints} className={btnSecondaryMd}>
            Save
          </button>
        </div>
      </SettingsCollapsibleSection>

      {msg ? <p className="text-sm font-medium text-lagoon-dark">{msg}</p> : null}
    </div>
  );
}
