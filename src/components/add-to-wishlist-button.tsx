"use client";

import { addProductToWishlist, removeProductFromWishlist } from "@/app/actions/wishlist";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { btnImportantMd, btnMainLg, btnSecondaryMd } from "@/lib/btn-theme-classes";

export function AddToWishlistButton({
  productId,
  variantId,
  unitPriceCentsAtAdd,
  timedSaleEventIdAtAdd,
  callbackUrl,
  disabled = false,
  initialInWishlist,
  storefrontProductPath,
  primary = false,
  availabilityNotifyMessage,
}: {
  productId: string;
  variantId: string | null;
  unitPriceCentsAtAdd: number;
  timedSaleEventIdAtAdd: string | null;
  /** Post-login redirect (product URL including `?event=` when applicable). */
  callbackUrl: string;
  /** When no purchasable variant is selected (multi-variant products) — applies to **add** only. */
  disabled?: boolean;
  initialInWishlist: boolean;
  /** e.g. `/product/my-slug` for `revalidatePath` after add/remove. */
  storefrontProductPath: string;
  /** Primary PDP CTA (replaces add-to-cart on in-breeding products). */
  primary?: boolean;
  /** Shown below the button on breeding product pages. */
  availabilityNotifyMessage?: string | null;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [inWishlist, setInWishlist] = useState(initialInWishlist);

  useEffect(() => {
    setInWishlist(initialInWishlist);
  }, [initialInWishlist, productId]);

  const onToggle = useCallback(() => {
    setMsg(null);
    start(async () => {
      try {
        if (inWishlist) {
          await removeProductFromWishlist(productId, storefrontProductPath);
          setInWishlist(false);
          setMsg("Removed from your wishlist.");
        } else {
          if (disabled) return;
          await addProductToWishlist({
            productId,
            variantId,
            unitPriceCentsAtAdd,
            timedSaleEventIdAtAdd,
            storefrontProductPath,
          });
          setInWishlist(true);
          setMsg("Saved to your wishlist.");
        }
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }, [
    inWishlist,
    disabled,
    productId,
    variantId,
    unitPriceCentsAtAdd,
    timedSaleEventIdAtAdd,
    storefrontProductPath,
    router,
  ]);

  const sectionClass = primary ? "mt-6 border-t border-palm/15 pt-6" : "mt-4";
  const buttonClass = primary
    ? inWishlist
      ? btnImportantMd
      : btnMainLg
    : inWishlist
      ? btnImportantMd
      : btnSecondaryMd;

  if (status === "loading") {
    return (
      <div className={sectionClass}>
        <button type="button" disabled className={`w-full sm:w-auto ${buttonClass} text-ink/50`}>
          Wishlist…
        </button>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "customer") {
    return (
      <div className={sectionClass}>
        {primary ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`}
            className={`inline-block w-full text-center sm:w-auto ${btnMainLg}`}
          >
            Add to wishlist
          </Link>
        ) : (
          <p className="text-sm text-ink/80">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`}
              className="font-bold text-lagoon-dark underline"
            >
              Log in
            </Link>{" "}
            to save items to your wishlist.
          </p>
        )}
        {availabilityNotifyMessage ? (
          <p className="mt-2 text-sm text-ink/70">{availabilityNotifyMessage}</p>
        ) : null}
      </div>
    );
  }

  const addBlocked = !inWishlist && disabled;

  return (
    <div className={sectionClass}>
      {inWishlist ? (
        <p className="mb-2 text-sm font-semibold text-palm dark:text-emerald-300">This product is in your wishlist.</p>
      ) : null}
      <button
        type="button"
        disabled={pending || addBlocked}
        onClick={onToggle}
        className={`w-full sm:w-auto ${buttonClass} disabled:cursor-not-allowed`}
      >
        {pending ? (inWishlist ? "Removing…" : "Saving…") : inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      </button>
      {addBlocked ? (
        <p className="mt-1 text-xs text-ink/60">Pick an option to add this item to your wishlist.</p>
      ) : null}
      {availabilityNotifyMessage ? (
        <p className="mt-2 text-sm text-ink/70">{availabilityNotifyMessage}</p>
      ) : null}
      {msg ? <p className="mt-2 text-xs font-semibold text-lagoon-dark">{msg}</p> : null}
    </div>
  );
}
