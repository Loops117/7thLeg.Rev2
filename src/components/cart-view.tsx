"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { applyCartCouponAction, clearCartCouponAction } from "@/app/actions/checkout-coupon-cart";
import { removeCartLabelLineAction } from "@/app/actions/label-cart";
import {
  removeCartLineAction,
  setCartAppliedLoyaltyPointsAction,
  setCartItemQuantityAction,
  setCartShippingOptionAction,
} from "@/app/actions/store-cart";
import { CartCheckoutButton } from "@/components/cart-checkout-button";
import { CartFreeCheckoutButton } from "@/components/cart-free-checkout-button";
import { CartSquarePayment } from "@/components/cart-square-payment";
import { btnImportantLink, btnMainMd } from "@/lib/btn-theme-classes";
import { shippingCentsAfterEventDiscount } from "@/lib/checkout-shipping-display";
import type { CartPaymentAvailability } from "@/lib/cart-payment-availability";
import { taxCentsFromSubtotal } from "@/lib/checkout-tax";
import { loyaltyDollarValueCents, planLoyaltyRedemptionForCheckout } from "@/lib/loyalty-redemption-preview";
import { formatPriceUsd } from "@/lib/product-slug";
import type { StorefrontShippingOption } from "@/lib/shipping-options-public";
import { LabelCartPreviewDialog } from "@/components/labels/label-cart-preview-dialog";
import type { LabelBuilderPublicConfig } from "@/lib/label-builder-public";
import type { CartLabelLineView } from "@/lib/cart-label-types";
import { cartLabelEntryDescription, labelPreviewEntriesForCartLine } from "@/lib/label-cart-display";
import type { CartLineView } from "@/lib/store-cart";

function summaryRow(label: ReactNode, amount: ReactNode, tone: "muted" | "accent" | "savings" = "muted") {
  const amt =
    tone === "savings" ? (
      <span className="font-black text-lagoon-dark">{amount}</span>
    ) : tone === "accent" ? (
      <span className="font-bold text-ink">{amount}</span>
    ) : (
      <span className="text-ink/90">{amount}</span>
    );
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className={tone === "muted" ? "text-ink/75" : "text-ink"}>{label}</span>
      {amt}
    </div>
  );
}

type LoyaltyCartPreview = {
  centsPerPoint: number;
  pointsBalance: number;
  maxPoints: number;
  appliedPoints: number;
};

type Props = {
  lines: CartLineView[];
  labelLines?: CartLabelLineView[];
  productSubtotalCents?: number;
  /** Label savings from the applied checkout coupon only. */
  labelCouponDiscountCents?: number;
  subtotalCents: number;
  merchandiseListSubtotalCents: number;
  timedEventSavingsCents: number;
  couponDiscountCents: number;
  kitDiscountCents?: number;
  appliedCouponCode: string | null;
  checkoutTaxRateBps: number;
  payments: CartPaymentAvailability;
  shippingOptions: StorefrontShippingOption[];
  selectedShippingOptionId: string | null;
  cartShippingUnitsTotal?: number;
  shippingRequiredButUnavailable?: boolean;
  loyaltyPreview: LoyaltyCartPreview | null;
  labelBuilderPublicConfig?: LabelBuilderPublicConfig | null;
  freeShippingActive?: boolean;
};

export function CartView({
  lines,
  labelLines = [],
  labelCouponDiscountCents = 0,
  subtotalCents,
  merchandiseListSubtotalCents,
  timedEventSavingsCents,
  couponDiscountCents,
  kitDiscountCents = 0,
  appliedCouponCode,
  checkoutTaxRateBps,
  payments,
  shippingOptions,
  selectedShippingOptionId,
  cartShippingUnitsTotal = 0,
  shippingRequiredButUnavailable = false,
  loyaltyPreview,
  labelBuilderPublicConfig = null,
  freeShippingActive = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [labelPreviewLine, setLabelPreviewLine] = useState<{
    title: string;
    entries: NonNullable<ReturnType<typeof labelPreviewEntriesForCartLine>>;
  } | null>(null);
  const [error, setError] = useState("");
  const [shippingError, setShippingError] = useState("");
  const [couponRaw, setCouponRaw] = useState("");
  const [promoFlash, setPromoFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const loyaltyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shippingPick = shippingOptions.find((o) => o.id === selectedShippingOptionId) ?? null;
  const shippingListCents = shippingPick?.priceCents ?? 0;
  const shippingCentsPick = shippingCentsAfterEventDiscount(shippingListCents, freeShippingActive);

  const effectiveRequested =
    loyaltyPreview && loyaltyPreview.maxPoints > 0
      ? Math.min(Math.max(0, loyaltyPreview.appliedPoints), loyaltyPreview.maxPoints)
      : 0;

  const loyaltyPlan =
    loyaltyPreview && subtotalCents > 0
      ? planLoyaltyRedemptionForCheckout({
          loyaltyProgramEnabled: true,
          redemptionCentsPerPoint: loyaltyPreview.centsPerPoint,
          customerPointsBalance: loyaltyPreview.pointsBalance,
          appliedLoyaltyPointsRequested: effectiveRequested,
          merchandiseSubtotalCents: subtotalCents,
        })
      : null;

  const loyaltyDiscountCents = loyaltyPlan?.discountCents ?? 0;
  const payableMerchCents = Math.max(0, subtotalCents - loyaltyDiscountCents);
  const estimatedTaxCents = taxCentsFromSubtotal(payableMerchCents, checkoutTaxRateBps);
  const orderTotalPreview = payableMerchCents + shippingCentsPick + estimatedTaxCents;

  const [pointsDraft, setPointsDraft] = useState(effectiveRequested);
  useEffect(() => {
    setPointsDraft(effectiveRequested);
  }, [effectiveRequested]);

  useEffect(() => {
    return () => {
      if (loyaltyDebounceRef.current) clearTimeout(loyaltyDebounceRef.current);
    };
  }, []);

  const hasActivePromo = Boolean(appliedCouponCode?.trim());
  const totalCouponSavingsCents = couponDiscountCents + labelCouponDiscountCents;
  const promoHasSavings = totalCouponSavingsCents > 0;
  const summaryHasDiscountRows =
    timedEventSavingsCents > 0 || hasActivePromo || kitDiscountCents > 0 || loyaltyDiscountCents > 0;

  useEffect(() => {
    if (!promoFlash || promoFlash.tone !== "success") return;
    const id = window.setTimeout(() => setPromoFlash(null), 10_000);
    return () => window.clearTimeout(id);
  }, [promoFlash]);

  function updateQty(lineId: string, qty: number) {
    setError("");
    startTransition(async () => {
      const res = await setCartItemQuantityAction(lineId, qty);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function remove(lineId: string) {
    setError("");
    startTransition(async () => {
      const res = await removeCartLineAction(lineId);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function removeLabel(lineId: string) {
    setError("");
    startTransition(async () => {
      const res = await removeCartLabelLineAction(lineId);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  if (lines.length === 0 && labelLines.length === 0) {
    return (
      <p className="mt-8 text-ink/80">
        Your cart is empty.{" "}
        <Link href="/store" className="font-medium text-lagoon-dark underline">
          Browse the store
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      <ul className="divide-y divide-palm/20">
        {lines.map((line) => (
          <li key={line.id} className="flex flex-wrap gap-4 py-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded border border-palm/25 bg-white">
              {line.imageUrl ? (
                line.imageUrl.startsWith("/") ? (
                  <Image src={line.imageUrl} alt="" fill className="object-contain" sizes="96px" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.imageUrl} alt="" className="h-full w-full object-contain" />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-ink/40">No image</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${line.slug}`} className="font-bold text-palm hover:underline">
                {line.name}
              </Link>
              {line.variantLabel ? (
                <p className="text-sm text-ink/70">{line.variantLabel}</p>
              ) : null}
              {line.kitBundleLabel ? (
                <p className="text-xs font-bold text-lagoon-dark">Part of kit: {line.kitBundleLabel}</p>
              ) : null}
              {line.baseUnitPriceCents > line.unitPriceCents ? (
                <p className="mt-1 text-sm text-ink/50 line-through">
                  {formatPriceUsd(line.baseUnitPriceCents)} each
                </p>
              ) : null}
              <p className="mt-1 text-sm text-ink">{formatPriceUsd(line.unitPriceCents)} each</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-sm text-ink/80">
                  Qty
                  <input
                    key={`${line.id}-${line.quantity}`}
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={line.quantity}
                    disabled={pending}
                    className="ml-2 w-16 border-2 border-palm-mid px-2 py-1 text-center"
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) updateQty(line.id, v);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  className={btnImportantLink}
                  onClick={() => remove(line.id)}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="text-right font-bold text-ink">{formatPriceUsd(line.lineTotalCents)}</div>
          </li>
        ))}
      </ul>

      {labelLines.length > 0 ? (
        <div>
          <h2 className="text-sm font-black text-palm">Custom labels</h2>
          <ul className="mt-3 divide-y divide-palm/20">
            {labelLines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{line.displayName}</p>
                  {line.isBundle && line.bundleEntries ? (
                    <ul className="mt-2 max-h-40 list-inside list-disc space-y-0.5 overflow-y-auto text-xs text-ink/75">
                      {line.bundleEntries.map((entry, idx) => (
                        <li key={`${entry.displayName}-${idx}`}>
                          {cartLabelEntryDescription(entry.displayName)}
                          <span className="text-ink/50">
                            {" "}
                            · {entry.templateName} · <span className="font-bold text-ink/70">Qty: {entry.quantity}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink/55">
                      {line.templateName} · {line.widthMm}×{line.heightMm} mm ·{" "}
                      <span className="font-bold text-ink/70">Qty: {line.quantity}</span>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {labelPreviewEntriesForCartLine(line) ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-sm font-bold text-palm underline"
                        onClick={() => {
                          const entries = labelPreviewEntriesForCartLine(line);
                          if (!entries) return;
                          setLabelPreviewLine({ title: line.displayName, entries });
                        }}
                      >
                        Preview all labels
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      className={btnImportantLink}
                      onClick={() => removeLabel(line.id)}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-ink/45">
                    To edit designs, remove this item from your cart, update labels in the builder, then add to cart
                    again.
                  </p>
                </div>
                <div className="text-right font-bold text-palm">{formatPriceUsd(line.lineTotalCents)}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {labelPreviewLine && labelBuilderPublicConfig ? (
        <LabelCartPreviewDialog
          open
          title={labelPreviewLine.title}
          entries={labelPreviewLine.entries}
          publicConfig={labelBuilderPublicConfig}
          onClose={() => setLabelPreviewLine(null)}
        />
      ) : null}

      <div
        className={`rounded border-2 p-4 shadow-sm ${
          hasActivePromo
            ? promoHasSavings
              ? "border-lagoon/40 bg-lagoon/10"
              : "border-mango/50 bg-mango/10"
            : "border-palm/25 bg-white/80"
        }`}
      >
        <h2 className="text-xs font-black uppercase tracking-wide text-palm-mid">Promo code</h2>
        <p className="mt-1 text-sm text-ink/75">Enter a code and press Apply. You’ll see below whether it’s accepted and how much you save.</p>

        {promoFlash ? (
          <p
            className={`mt-3 rounded border px-3 py-2 text-sm font-medium ${
              promoFlash.tone === "success"
                ? "border-lagoon/45 bg-white text-lagoon-dark"
                : "border-coral/45 bg-coral/10 text-coral"
            }`}
            role="status"
          >
            {promoFlash.text}
          </p>
        ) : null}

        {hasActivePromo ? (
          <div className="mt-3 rounded border border-palm/20 bg-white/90 px-3 py-2 text-sm text-ink">
            <p className="font-bold text-palm">
              Promotion status: <span className="font-mono text-ink">{appliedCouponCode}</span>
            </p>
            {promoHasSavings ? (
              <p className="mt-1 text-ink/85">
                This code is{" "}
                <span className="font-bold text-lagoon-dark">saving you {formatPriceUsd(totalCouponSavingsCents)}</span>{" "}
                on your cart
                {labelCouponDiscountCents > 0 && couponDiscountCents > 0
                  ? " (products and custom labels)"
                  : labelCouponDiscountCents > 0
                    ? " (custom labels)"
                    : ""}
                .
              </p>
            ) : (
              <p className="mt-1 text-ink/80">
                The code is saved, but <span className="font-bold">it isn’t taking anything off yet</span> — usually that
                means none of these items match the promotion catalog, the coupon doesn’t include Label Maker, or
                products are excluded by the coupon’s product picker in Settings → Events.
              </p>
            )}
          </div>
        ) : null}

        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPromoFlash(null);
            startTransition(async () => {
              const res = await applyCartCouponAction(couponRaw);
              if (!res.ok) {
                setPromoFlash({ tone: "error", text: res.error });
                return;
              }
              const code = res.normalizedCode;
              if (res.discountCents > 0) {
                setPromoFlash({
                  tone: "success",
                  text: `Success — “${code}” is applied. You’re saving ${formatPriceUsd(res.discountCents)} on this cart right now.`,
                });
              } else {
                setPromoFlash({
                  tone: "success",
                  text: `Success — “${code}” is accepted and saved, but it’s taking $0 off your current items (see status above after the page updates).`,
                });
              }
              setCouponRaw("");
              router.refresh();
            });
          }}
        >
          <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink">
            Code
            <input
              value={couponRaw}
              onChange={(e) => {
                setCouponRaw(e.target.value);
                if (promoFlash?.tone === "error") setPromoFlash(null);
              }}
              disabled={pending}
              className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm uppercase"
              placeholder="ENTER CODE"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className={btnMainMd}
          >
            {pending ? "Checking…" : "Apply"}
          </button>
        </form>
        {hasActivePromo ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/85">
            <button
              type="button"
              disabled={pending}
              className={btnImportantLink}
              onClick={() => {
                setPromoFlash(null);
                startTransition(async () => {
                  const res = await clearCartCouponAction();
                  if (!res.ok) {
                    setPromoFlash({ tone: "error", text: res.error });
                  } else {
                    setPromoFlash({ tone: "success", text: "Promotion removed from your cart." });
                  }
                  router.refresh();
                });
              }}
            >
              Remove promotion from cart
            </button>
          </div>
        ) : null}
      </div>

      {loyaltyPreview && loyaltyPreview.pointsBalance > 0 ? (
        <div className="rounded border-2 border-palm/25 bg-white/80 p-4 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wide text-palm-mid">Loyalty points</h2>
          {loyaltyPreview.maxPoints > 0 ? (
            <>
              <p className="mt-2 text-sm text-ink/85">
                You have <span className="font-bold text-palm">{loyaltyPreview.pointsBalance}</span> points
                {loyaltyPreview.centsPerPoint > 0 ? (
                  <>
                    {" "}
                    (worth <span className="font-bold">{formatPriceUsd(loyaltyDollarValueCents(loyaltyPreview.pointsBalance, loyaltyPreview.centsPerPoint))}</span> at{" "}
                    <span className="font-bold">{formatPriceUsd(loyaltyPreview.centsPerPoint)}</span> per point).
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-ink/70">
                Up to <span className="font-bold">{loyaltyPreview.maxPoints}</span> points can apply to this order (
                <span className="font-bold">{formatPriceUsd(loyaltyPreview.maxPoints * loyaltyPreview.centsPerPoint)}</span>{" "}
                max off merchandise).
              </p>
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-bold text-ink">
                  Points to use on this order
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={loyaltyPreview.maxPoints}
                      value={pointsDraft}
                      disabled={pending}
                      className="min-w-[12rem] flex-1 accent-palm"
                      onChange={(e) => {
                        const v = Math.min(loyaltyPreview.maxPoints, Math.max(0, parseInt(e.target.value, 10) || 0));
                        setPointsDraft(v);
                        if (loyaltyDebounceRef.current) clearTimeout(loyaltyDebounceRef.current);
                        loyaltyDebounceRef.current = setTimeout(() => {
                          loyaltyDebounceRef.current = null;
                          setError("");
                          startTransition(async () => {
                            const res = await setCartAppliedLoyaltyPointsAction(v);
                            if (!res.ok) setError(res.error);
                            router.refresh();
                          });
                        }, 350);
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      max={loyaltyPreview.maxPoints}
                      value={pointsDraft}
                      disabled={pending}
                      className="w-20 border-2 border-palm-mid px-2 py-1 text-center text-sm"
                      onChange={(e) => {
                        const v = Math.min(
                          loyaltyPreview.maxPoints,
                          Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        );
                        setPointsDraft(v);
                        if (loyaltyDebounceRef.current) clearTimeout(loyaltyDebounceRef.current);
                        loyaltyDebounceRef.current = setTimeout(() => {
                          loyaltyDebounceRef.current = null;
                          setError("");
                          startTransition(async () => {
                            const res = await setCartAppliedLoyaltyPointsAction(v);
                            if (!res.ok) setError(res.error);
                            router.refresh();
                          });
                        }, 350);
                      }}
                    />
                  </div>
                </label>
                {loyaltyDiscountCents > 0 ? (
                  <p className="text-sm font-bold text-lagoon-dark">
                    ≈ {formatPriceUsd(loyaltyDiscountCents)} off merchandise (preview — exact total is confirmed at
                    payment).
                  </p>
                ) : (
                  <p className="text-xs text-ink/65">Move the slider to apply points. Points are removed from your balance after the order is paid.</p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/80">
              You have <span className="font-bold">{loyaltyPreview.pointsBalance}</span> points, but none can be applied
              to this cart total at the current rate.
            </p>
          )}
        </div>
      ) : null}

      {shippingOptions.length > 0 ? (
        <div className="rounded border-2 border-palm/25 bg-white/80 p-4 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wide text-palm-mid">Shipping</h2>
          <p className="mt-1 text-sm text-ink/75">Choose how this order should be delivered or picked up.</p>
          {cartShippingUnitsTotal > 0 ? (
            <p className="mt-1 text-xs text-ink/60">Order size: {cartShippingUnitsTotal} shipping units</p>
          ) : null}
          {shippingError ? <p className="mt-2 text-sm font-medium text-coral">{shippingError}</p> : null}
          <ul className="mt-4 space-y-3">
            {shippingOptions.map((opt) => {
              const checked = opt.id === selectedShippingOptionId;
              return (
                <li key={opt.id}>
                  <label className="flex cursor-pointer gap-3 rounded border border-palm/20 bg-sand/40 p-3 hover:bg-sand/70">
                    <input
                      type="radio"
                      name="shipping-option"
                      className="mt-1 h-4 w-4 border-palm accent-palm"
                      checked={checked}
                      disabled={pending}
                      onChange={() => {
                        setShippingError("");
                        startTransition(async () => {
                          const res = await setCartShippingOptionAction(opt.id);
                          if (!res.ok) setShippingError(res.error);
                          router.refresh();
                        });
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-ink">{opt.label}</span>
                      {opt.description.trim() ? (
                        <span className="mt-1 block text-sm text-ink/70">{opt.description}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-bold text-ink">{formatPriceUsd(opt.priceCents)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : shippingRequiredButUnavailable ? (
        <div className="rounded border-2 border-coral/40 bg-coral/5 p-4 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wide text-coral">Shipping unavailable</h2>
          <p className="mt-2 text-sm text-ink/85">
            No shipping method fits this cart ({cartShippingUnitsTotal} units). Remove items or contact the store.
          </p>
        </div>
      ) : null}

      <div className="border-t-4 border-palm pt-4">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-palm-mid">Order summary</h2>
        <div className="max-w-md space-y-2 text-right sm:ml-auto">
          {summaryHasDiscountRows
            ? summaryRow("Merchandise (catalog)", formatPriceUsd(merchandiseListSubtotalCents), "muted")
            : null}
          {timedEventSavingsCents > 0
            ? summaryRow("Timed sale savings", `−${formatPriceUsd(timedEventSavingsCents)}`, "savings")
            : null}
          {hasActivePromo
            ? summaryRow(
                <>
                  Promo <span className="font-mono">({appliedCouponCode})</span>
                </>,
                promoHasSavings ? `−${formatPriceUsd(totalCouponSavingsCents)}` : `−${formatPriceUsd(0)}`,
                promoHasSavings ? "savings" : "muted",
              )
            : null}
          {kitDiscountCents > 0
            ? summaryRow("Kit bundle savings", `−${formatPriceUsd(kitDiscountCents)}`, "savings")
            : null}
          {loyaltyDiscountCents > 0
            ? summaryRow(
                <>Loyalty points ({effectiveRequested} pts)</>,
                `−${formatPriceUsd(loyaltyDiscountCents)}`,
                "savings",
              )
            : null}
          {summaryRow(
            summaryHasDiscountRows ? "Merchandise subtotal" : "Subtotal",
            formatPriceUsd(payableMerchCents),
            "accent",
          )}
          {estimatedTaxCents > 0
            ? summaryRow("Est. sales tax", formatPriceUsd(estimatedTaxCents), "muted")
            : null}
          {shippingOptions.length > 0
            ? summaryRow(
                freeShippingActive && shippingListCents > 0 ? (
                  <>
                    Shipping <span className="font-normal text-lagoon-dark">(free — promotion)</span>
                  </>
                ) : (
                  "Shipping"
                ),
                freeShippingActive && shippingListCents > 0 ? (
                  <span>
                    <span className="text-ink/45 line-through">{formatPriceUsd(shippingListCents)}</span>{" "}
                    {formatPriceUsd(0)}
                  </span>
                ) : (
                  formatPriceUsd(shippingCentsPick)
                ),
                "muted",
              )
            : null}
          <div className="border-t-2 border-palm/25 pt-2">
            <div className="flex justify-between gap-4 text-lg font-black text-palm">
              <span>Total</span>
              <span className="text-ink">{formatPriceUsd(orderTotalPreview)}</span>
            </div>
          </div>
        </div>

        {!payments.stripeEnabled && !payments.squareEnabled && orderTotalPreview > 0 ? (
          <p className="mt-4 max-w-md text-sm text-ink/70 sm:ml-auto sm:text-right">
            Checkout is turned off here or hasn’t finished setup yet — ask the store when online payments open.
          </p>
        ) : null}

        <div className="mt-6 max-w-md space-y-4 sm:ml-auto">
          {shippingRequiredButUnavailable ? (
            <p className="text-sm font-medium text-coral">
              Checkout is blocked until your cart fits an available shipping box.
            </p>
          ) : orderTotalPreview <= 0 ? (
            <CartFreeCheckoutButton disabled={lines.length === 0 && labelLines.length === 0} />
          ) : (
            <>
              {payments.stripeEnabled ? (
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wide text-palm-mid">Stripe</p>
                  <CartCheckoutButton />
                </div>
              ) : null}
              {payments.squareEnabled ? (
                <div className="text-left">
                  <CartSquarePayment />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
