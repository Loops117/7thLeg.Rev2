"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  approveProductReview,
  deleteProductReview,
  importProductReview,
  rejectProductReview,
  saveProductReviewsSettings,
  searchProductsForReviewImport,
  type ProductReviewsSettingsState,
} from "@/app/actions/product-reviews-admin";
import { btnImportantMd, btnMainMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  filterReviewAdminRows,
  GENERAL_REVIEW_LABEL,
  starsLabel,
  type ProductReviewAdminRow,
  type ProductReviewStatusFilter,
} from "@/lib/product-reviews";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: ProductReviewAdminRow["status"] }) {
  if (status === "APPROVED") {
    return <span className="text-xs font-bold text-palm dark:text-emerald-300">Approved</span>;
  }
  if (status === "REJECTED") {
    return <span className="text-xs font-bold text-ink/50">Rejected</span>;
  }
  return <span className="text-xs font-bold text-coral">Pending</span>;
}

export function ProductReviewsAdmin({
  initialRows,
  initialSettings,
}: {
  initialRows: ProductReviewAdminRow[];
  initialSettings: ProductReviewsSettingsState;
}) {
  const [rows, setRows] = useState(initialRows);
  const [settings, setSettings] = useState(initialSettings);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProductReviewStatusFilter>("all");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [importProductId, setImportProductId] = useState("");
  const [importAuthor, setImportAuthor] = useState("");
  const [importRating, setImportRating] = useState(5);
  const [importTitle, setImportTitle] = useState("");
  const [importBody, setImportBody] = useState("");
  const [importApproveNow, setImportApproveNow] = useState(true);
  const [importCreatedAt, setImportCreatedAt] = useState("");

  const visible = useMemo(() => filterReviewAdminRows(rows, { q, status }), [rows, q, status]);

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setMsg("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setMsg(r.error ?? "Action failed.");
        return;
      }
      onOk?.();
    });
  }

  function patchRow(id: string, patch: Partial<ProductReviewAdminRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function onSearchProducts(term: string) {
    setProductQuery(term);
    startTransition(async () => {
      const hits = await searchProductsForReviewImport(term);
      setProductHits(hits);
    });
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded border-2 border-palm/25 bg-white/90 p-5 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
        <h2 className="text-lg font-black text-palm dark:text-zinc-200">Storefront & email</h2>
        <label className="flex cursor-pointer items-start gap-2 text-sm font-bold text-ink dark:text-zinc-200">
          <input
            type="checkbox"
            checked={settings.productReviewsEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, productReviewsEnabled: e.target.checked }))}
          />
          Allow customers to submit reviews on product pages
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm font-bold text-ink dark:text-zinc-200">
          <input
            type="checkbox"
            checked={settings.reviewRequestEmailEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, reviewRequestEmailEnabled: e.target.checked }))}
          />
          Send review request email after a paid order is fulfilled
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-200">
          Review request subject
          <input
            type="text"
            value={settings.reviewRequestEmailSubject}
            onChange={(e) => setSettings((s) => ({ ...s, reviewRequestEmailSubject: e.target.value }))}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm font-bold text-ink dark:text-zinc-200">
          Review request body
          <textarea
            value={settings.reviewRequestEmailBody}
            onChange={(e) => setSettings((s) => ({ ...s, reviewRequestEmailBody: e.target.value }))}
            rows={8}
            className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <p className="text-xs text-ink/60 dark:text-zinc-400">
          Placeholders: <code>{"{{customerName}}"}</code>, <code>{"{{reviewUrl}}"}</code>,{" "}
          <code>{"{{companyName}}"}</code>, <code>{"{{orderId}}"}</code>. Requires SMTP in{" "}
          <Link href="/settings/email" className="text-lagoon-dark underline">
            Settings → Email
          </Link>
          .
        </p>
        <button
          type="button"
          disabled={pending}
          className={btnMainMd}
          onClick={() =>
            runAction(async () => {
              const r = await saveProductReviewsSettings(settings);
              return r.ok ? { ok: true } : { ok: false, error: r.error };
            }, () => setMsg("Settings saved."))
          }
        >
          Save settings
        </button>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-palm dark:text-zinc-200">All reviews</h2>
          <button type="button" className={btnSecondaryMd} onClick={() => setShowImport((v) => !v)}>
            {showImport ? "Hide import" : "Import legacy review"}
          </button>
        </div>

        {showImport ? (
          <form
            className="space-y-3 rounded border-2 border-palm/25 bg-white/90 p-4 dark:border-zinc-600 dark:bg-zinc-900/60"
            onSubmit={(e) => {
              e.preventDefault();
              runAction(
                async () => {
                  const r = await importProductReview({
                    productId: importProductId || null,
                    authorDisplayName: importAuthor,
                    rating: importRating,
                    title: importTitle,
                    body: importBody,
                    approveNow: importApproveNow,
                    createdAtIso: importCreatedAt || undefined,
                  });
                  return r.ok ? { ok: true } : { ok: false, error: r.error };
                },
                () => {
                  setMsg("Review imported.");
                  setShowImport(false);
                  window.location.reload();
                },
              );
            }}
          >
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink dark:text-zinc-200">
                Product <span className="font-normal text-ink/50">(optional — leave blank for a general store review)</span>
                <input
                  type="search"
                  value={productQuery}
                  onChange={(e) => onSearchProducts(e.target.value)}
                  placeholder="Search catalog…"
                  className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <button
                type="button"
                className={`text-xs font-bold underline ${!importProductId ? "text-palm" : "text-lagoon-dark"}`}
                onClick={() => {
                  setImportProductId("");
                  setProductQuery("");
                  setProductHits([]);
                }}
              >
                General store review (no product)
              </button>
            </div>
            {productHits.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded border border-palm/20 text-sm dark:border-zinc-600">
                {productHits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`block w-full px-2 py-1.5 text-left hover:bg-palm/10 ${
                        importProductId === p.id ? "bg-palm/15 font-bold" : ""
                      }`}
                      onClick={() => {
                        setImportProductId(p.id);
                        setProductQuery(p.name);
                        setProductHits([]);
                      }}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="block text-xs font-bold text-ink dark:text-zinc-200">
              Author name
              <input
                type="text"
                required
                value={importAuthor}
                onChange={(e) => setImportAuthor(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-bold text-ink dark:text-zinc-200">
              Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={importRating}
                onChange={(e) => setImportRating(Number(e.target.value))}
                className="mt-1 w-24 border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-bold text-ink dark:text-zinc-200">
              Title (optional)
              <input
                type="text"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-bold text-ink dark:text-zinc-200">
              Review text
              <textarea
                required
                rows={4}
                value={importBody}
                onChange={(e) => setImportBody(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-bold text-ink dark:text-zinc-200">
              Original date (optional)
              <input
                type="date"
                value={importCreatedAt}
                onChange={(e) => setImportCreatedAt(e.target.value)}
                className="mt-1 border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink dark:text-zinc-200">
              <input
                type="checkbox"
                checked={importApproveNow}
                onChange={(e) => setImportApproveNow(e.target.checked)}
              />
              Approve immediately (visible on site & panes)
            </label>
            <button type="submit" disabled={pending} className={btnMainMd}>
              Import review
            </button>
          </form>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 rounded border-2 border-palm/25 bg-white/90 p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
          <label className="block min-w-[10rem] flex-1 text-xs font-bold text-ink dark:text-zinc-200">
            Search
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Product, author, text…"
              className="mt-1 w-full border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-xs font-bold text-ink dark:text-zinc-200">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductReviewStatusFilter)}
              className="mt-1 block min-w-[8rem] border-2 border-palm-mid px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        </div>

        {msg ? <p className="text-sm font-medium text-palm">{msg}</p> : null}

        <div className="overflow-x-auto rounded border-2 border-palm/25 bg-white/90 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b-2 border-palm/20 bg-palm/5 text-xs font-bold uppercase tracking-wide text-ink/70 dark:text-zinc-300">
              <tr>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Author</th>
                <th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Review</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-ink/60">
                    No reviews match your filters.
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="border-b border-palm/10 align-top dark:border-zinc-700">
                    <td className="px-3 py-3">
                      {r.productId && r.productSlug ? (
                        <Link href={`/product/${r.productSlug}`} className="font-medium text-lagoon-dark underline">
                          {r.productName}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink/80">{GENERAL_REVIEW_LABEL}</span>
                      )}
                      {r.isImported ? (
                        <span className="mt-1 block text-xs text-ink/50">Imported</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{r.authorName}</div>
                      {r.customerEmail ? <div className="text-xs text-ink/50">{r.customerEmail}</div> : null}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{starsLabel(r.rating)}</td>
                    <td className="max-w-xs px-3 py-3">
                      {r.title ? <div className="font-bold">{r.title}</div> : null}
                      <p className="text-ink/85">{r.body}</p>
                      <p className="mt-1 text-xs text-ink/50">Submitted {formatDate(r.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                      {r.status === "APPROVED" ? (
                        <p className="mt-1 text-xs text-ink/50">{formatDate(r.approvedAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {r.status !== "APPROVED" ? (
                          <button
                            type="button"
                            disabled={pending}
                            className={btnMainMd}
                            onClick={() =>
                              runAction(
                                async () => {
                                  const res = await approveProductReview(r.id);
                                  return res.ok ? { ok: true } : { ok: false, error: res.error };
                                },
                                () =>
                                  patchRow(r.id, {
                                    status: "APPROVED",
                                    approvedAt: new Date().toISOString(),
                                    rejectedAt: null,
                                  }),
                              )
                            }
                          >
                            Approve
                          </button>
                        ) : null}
                        {r.status !== "REJECTED" ? (
                          <button
                            type="button"
                            disabled={pending}
                            className={btnSecondaryMd}
                            onClick={() =>
                              runAction(
                                async () => {
                                  const res = await rejectProductReview(r.id);
                                  return res.ok ? { ok: true } : { ok: false, error: res.error };
                                },
                                () =>
                                  patchRow(r.id, {
                                    status: "REJECTED",
                                    rejectedAt: new Date().toISOString(),
                                    approvedAt: null,
                                  }),
                              )
                            }
                          >
                            Reject
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={pending}
                          className={btnImportantMd}
                          onClick={() => {
                            if (!window.confirm("Delete this review permanently?")) return;
                            runAction(
                              async () => {
                                const res = await deleteProductReview(r.id);
                                return res.ok ? { ok: true } : { ok: false, error: res.error };
                              },
                              () => removeRow(r.id),
                            );
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
