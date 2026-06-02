"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeWishlistItem } from "@/app/actions/wishlist";
import { btnImportantSm } from "@/lib/btn-theme-classes";

export function WishlistRemoveButton({ wishlistItemId }: { wishlistItemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Remove this item from your wishlist?")) return;
        start(async () => {
          await removeWishlistItem(wishlistItemId);
          router.refresh();
        });
      }}
      className={btnImportantSm}
    >
      {pending ? "…" : "Remove"}
    </button>
  );
}
