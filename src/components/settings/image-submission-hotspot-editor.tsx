"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  listImageSubmissionHotspotsForAdmin,
  saveImageSubmissionHotspots,
  searchProductsForHotspotPicker,
  type PinDraftInput,
  type ProductPickerOption,
} from "@/app/actions/image-submission-hotspots";
import { btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import { clientPointToImagePercent, pinCenterToContainerStyle } from "@/lib/image-hotspot-layout";
import { SubmissionPinMarker } from "@/components/gallery/submission-pin-marker";
import type { ImageSubmissionPinAppearance } from "@/lib/image-submission-pin-appearance-shared";
import type { ImageSubmissionHotspotRow } from "@/lib/image-submission-hotspots";

type DraftPin = PinDraftInput & {
  clientId: string;
  productName: string;
  productSlug: string;
  variantLabel: string | null;
};

function rowToDraft(r: ImageSubmissionHotspotRow): DraftPin {
  return {
    clientId: r.id,
    productId: r.productId,
    productName: r.productName,
    productSlug: r.productSlug,
    variantId: r.variantId,
    variantLabel: r.variantLabel,
    xPercent: r.xPercent,
    yPercent: r.yPercent,
  };
}

function newClientId() {
  return `new-${Math.random().toString(36).slice(2, 9)}`;
}

export function ImageSubmissionHotspotEditor({
  submissionId,
  imageUrl,
  pinAppearance,
}: {
  submissionId: string;
  imageUrl: string;
  pinAppearance: ImageSubmissionPinAppearance;
}) {
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [pins, setPins] = useState<DraftPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<ProductPickerOption[]>([]);
  const [productSearchBusy, setProductSearchBusy] = useState(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductPickerOption | null>(null);
  const [pickVariantId, setPickVariantId] = useState("");
  const [layoutSize, setLayoutSize] = useState({ cw: 0, ch: 0, nw: 0, nh: 0 });

  const measure = useCallback(() => {
    const wrap = imgWrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    setLayoutSize({
      cw: wrap.clientWidth,
      ch: wrap.clientHeight,
      nw: img.naturalWidth,
      nh: img.naturalHeight,
    });
  }, []);

  const loadPins = useCallback(async () => {
    setLoading(true);
    const r = await listImageSubmissionHotspotsForAdmin(submissionId);
    if (Array.isArray(r)) {
      setPins(r.map(rowToDraft));
    }
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    void loadPins();
  }, [loadPins]);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      setProductSearchBusy(true);
      setProductSearchError(null);
      void searchProductsForHotspotPicker(productQuery.trim()).then((r) => {
        if (cancelled) return;
        setProductSearchBusy(false);
        if (Array.isArray(r)) {
          setProductHits(r);
        } else {
          setProductSearchError(r.error);
          setProductHits([]);
        }
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [productQuery]);

  useEffect(() => {
    const wrap = imgWrapRef.current;
    if (!wrap) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [measure, imageUrl]);

  function selectProduct(p: ProductPickerOption) {
    setSelectedProduct(p);
    setPickVariantId(p.variants.length === 1 ? p.variants[0].id : "");
    setProductSearchError(null);
  }

  function canPlacePin(): boolean {
    if (!selectedProduct) return false;
    if (selectedProduct.variants.length > 0 && !pickVariantId) return false;
    return true;
  }

  function onImageClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, a")) return;
    if (!canPlacePin()) {
      setMsg(
        selectedProduct && selectedProduct.variants.length > 0 && !pickVariantId
          ? "Choose a variation before placing a pin."
          : "Select a product (and variation if needed) before placing a pin.",
      );
      return;
    }
    const el = imgWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nw = imgRef.current?.naturalWidth ?? layoutSize.nw;
    const nh = imgRef.current?.naturalHeight ?? layoutSize.nh;
    const p = clientPointToImagePercent(e.clientX, e.clientY, rect, nw, nh);
    const prod = selectedProduct!;
    const variant = prod.variants.find((v) => v.id === pickVariantId) ?? null;
    setPins((list) => [
      ...list,
      {
        clientId: newClientId(),
        productId: prod.id,
        productName: prod.name,
        productSlug: prod.slug,
        variantId: variant?.id ?? null,
        variantLabel: variant?.label ?? null,
        xPercent: p.x,
        yPercent: p.y,
      },
    ]);
    setMsg(null);
  }

  function removePin(clientId: string) {
    setPins((list) => list.filter((h) => h.clientId !== clientId));
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const payload: PinDraftInput[] = pins.map((h) => ({
        productId: h.productId,
        variantId: h.variantId,
        xPercent: h.xPercent,
        yPercent: h.yPercent,
      }));
      const r = await saveImageSubmissionHotspots(submissionId, payload);
      if (!r.ok) {
        setMsg(r.error);
        return;
      }
      setMsg("Pins saved.");
      await loadPins();
    });
  }

  return (
    <div className="mt-4 border-t border-palm/15 pt-4 dark:border-zinc-700">
      <h3 className="text-sm font-black text-palm dark:text-emerald-300">Product pins</h3>
      <p className="mt-1 text-xs text-ink/65 dark:text-zinc-400">
        Select a product and variation, then click on the image to drop a pin. Shoppers see the variation name on hover and
        open that exact option on the product page.
      </p>

      <div className="mt-3 space-y-3">
        <label className="block text-xs font-bold text-ink dark:text-zinc-200">
          Search products &amp; variations
          <input
            type="search"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Product name, slug, variation label, or SKU…"
            className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        {productSearchBusy ? (
          <p className="text-xs text-ink/55">Searching…</p>
        ) : productSearchError ? (
          <p className="text-xs font-medium text-coral">{productSearchError}</p>
        ) : productHits.length === 0 ? (
          <p className="text-xs text-ink/55">
            {productQuery.trim() ? "No products match that search." : "No products in the catalog yet."}
          </p>
        ) : (
          <ul className="max-h-36 space-y-1 overflow-y-auto rounded border border-palm/25 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-950">
            {productHits.map((p) => {
              const selected = selectedProduct?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectProduct(p)}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition ${
                      selected
                        ? "bg-palm/15 font-bold text-palm dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "text-ink hover:bg-surf/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="block font-bold">{p.name}</span>
                    <span className="text-ink/55 dark:text-zinc-500">
                      /{p.slug}
                      {p.variants.length > 0
                        ? ` · ${p.variants.length} variation${p.variants.length === 1 ? "" : "s"}`
                        : " · no variations"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selectedProduct ? (
          <div className="rounded border border-palm/25 bg-palm/5 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900/50">
            <p className="text-xs font-bold text-palm dark:text-emerald-300">Selected: {selectedProduct.name}</p>
            {selectedProduct.variants.length > 0 ? (
              <label className="mt-2 block text-xs font-bold text-ink dark:text-zinc-200">
                Variation <span className="text-coral">*</span>
                <select
                  value={pickVariantId}
                  onChange={(e) => setPickVariantId(e.target.value)}
                  className="mt-1 block w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">— choose variation —</option>
                  {selectedProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                      {!v.active ? " — inactive" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-1 text-xs text-ink/60">No variations — pin links to this product.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink/55">Click a product above, then click the image to place a pin.</p>
        )}
      </div>

      <div
        ref={imgWrapRef}
        role="presentation"
        className={`relative mt-4 overflow-hidden rounded border-2 border-palm/25 bg-zinc-100 ${canPlacePin() ? "cursor-crosshair" : "cursor-not-allowed"}`}
        onClick={onImageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className="mx-auto block max-h-[50vh] w-full object-contain pointer-events-none"
          draggable={false}
          onLoad={measure}
        />
        {pins.map((pin) => {
          const pos = pinCenterToContainerStyle(
            pin.xPercent,
            pin.yPercent,
            layoutSize.cw,
            layoutSize.ch,
            layoutSize.nw,
            layoutSize.nh,
          );
          if (!pos) return null;
          return (
            <SubmissionPinMarker
              key={pin.clientId}
              appearance={pinAppearance}
              position={pos}
              interactive={false}
              label={pin.variantLabel ?? pin.productName}
            />
          );
        })}
      </div>

      {loading ? <p className="mt-2 text-xs text-ink/55">Loading pins…</p> : null}

      {pins.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {pins.map((pin) => (
            <li
              key={pin.clientId}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-palm/20 bg-white/80 px-3 py-2 text-xs"
            >
              <span className="font-medium text-ink">
                {pin.variantLabel ?? pin.productName}
                <span className="text-ink/50">
                  {" "}
                  · {Math.round(pin.xPercent)}%, {Math.round(pin.yPercent)}%
                </span>
              </span>
              <button type="button" onClick={() => removePin(pin.clientId)} className="font-bold text-coral underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-ink/55">No pins yet.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={save} className={btnMainMd}>
          {pending ? "Saving…" : "Save pins"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-sm font-medium text-lagoon-dark">{msg}</p> : null}
    </div>
  );
}
