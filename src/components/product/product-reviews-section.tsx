"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitProductReview } from "@/app/actions/product-reviews";
import { btnMainMd } from "@/lib/btn-theme-classes";
import type { ProductReviewPublicRow } from "@/lib/product-reviews";
import { PRODUCT_REVIEW_RATING_MAX, starsLabel } from "@/lib/product-reviews";

function formatReviewDate(iso: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "";
  }
}

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {Array.from({ length: PRODUCT_REVIEW_RATING_MAX }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition ${
            n <= value ? "text-palm" : "text-ink/25"
          } disabled:opacity-50`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProductReviewsSection({
  productId,
  productSlug,
  productName,
  reviews,
  reviewsEnabled,
  isLoggedIn,
  existingReview,
  focusForm,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  reviews: ProductReviewPublicRow[];
  reviewsEnabled: boolean;
  isLoggedIn: boolean;
  existingReview: { rating: number; title: string; body: string; status: string } | null;
  focusForm?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!reviewsEnabled) return null;

  const canSubmit =
    isLoggedIn &&
    (!existingReview || existingReview.status === "PENDING" || existingReview.status === "REJECTED");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const r = await submitProductReview({ productId, rating, title, body });
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setMsg(
        existingReview?.status === "REJECTED" || existingReview?.status === "PENDING"
          ? "Thanks — your updated review was submitted for approval."
          : "Thanks — your review was submitted for approval.",
      );
      router.refresh();
    });
  }

  return (
    <section
      id="product-reviews"
      className="mt-8 border-t border-palm/15 pt-6"
      aria-labelledby="product-reviews-heading"
    >
      <h2 id="product-reviews-heading" className="text-sm font-black uppercase tracking-wide text-palm">
        Customer reviews
      </h2>

      {reviews.length > 0 ? (
        <ul className="mt-5 space-y-0">
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-palm/15 py-5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm text-palm" aria-label={`${r.rating} out of 5 stars`}>
                  {starsLabel(r.rating)}
                </span>
                {r.approvedAt ? (
                  <time className="text-xs text-ink/50" dateTime={r.approvedAt}>
                    {formatReviewDate(r.approvedAt)}
                  </time>
                ) : null}
              </div>
              {r.title ? <p className="mt-2 font-bold text-ink">{r.title}</p> : null}
              <p className="mt-2 whitespace-pre-wrap text-ink leading-relaxed [&_a]:text-lagoon-dark [&_a]:underline">
                {r.body}
              </p>
              <p className="mt-3 text-sm text-ink/70">By: {r.authorName}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-ink/70">No reviews yet for {productName}.</p>
      )}

      {canSubmit ? (
        <form
          onSubmit={onSubmit}
          className={`mt-6 max-w-xl space-y-4 border-t border-palm/15 pt-6 ${
            focusForm ? "ring-2 ring-palm/30 ring-offset-2" : ""
          }`}
        >
          <h3 className="text-sm font-black uppercase tracking-wide text-palm">Write a review</h3>
          {existingReview?.status === "PENDING" ? (
            <p className="text-sm text-ink/70">Your review is awaiting approval. You can update it below.</p>
          ) : null}
          {existingReview?.status === "REJECTED" ? (
            <p className="text-sm text-coral">Your previous review was not published. You can submit a new one.</p>
          ) : null}
          <label className="block text-sm font-bold text-ink">
            Rating
            <div className="mt-1">
              <StarPicker value={rating} onChange={setRating} disabled={pending} />
            </div>
          </label>
          <label className="block text-sm font-bold text-ink">
            Title <span className="font-normal text-ink/50">(optional)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={pending}
              className="mt-1 w-full border-2 border-palm-mid bg-transparent px-2 py-2 text-sm text-ink"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            Your review
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              maxLength={4000}
              disabled={pending}
              className="mt-1 w-full border-2 border-palm-mid bg-transparent px-2 py-2 text-sm text-ink"
            />
          </label>
          {err ? <p className="text-sm font-medium text-coral">{err}</p> : null}
          {msg ? <p className="text-sm font-medium text-palm">{msg}</p> : null}
          <button type="submit" disabled={pending} className={btnMainMd}>
            {pending ? "Submitting…" : "Submit review"}
          </button>
        </form>
      ) : !isLoggedIn ? (
        <p className="mt-6 border-t border-palm/15 pt-6 text-sm text-ink/75">
          <a
            href={`/login?callbackUrl=${encodeURIComponent(`/product/${productSlug}`)}`}
            className="font-medium text-lagoon-dark underline"
          >
            Sign in
          </a>{" "}
          to leave a review.
        </p>
      ) : existingReview?.status === "APPROVED" ? (
        <p className="mt-6 border-t border-palm/15 pt-6 text-sm text-ink/70">
          You already published a review for this product. Thank you!
        </p>
      ) : null}
    </section>
  );
}
