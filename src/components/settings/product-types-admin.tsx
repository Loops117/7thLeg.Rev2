"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createProductType,
  deleteProductType,
  moveProductType,
} from "@/app/actions/product-types-admin";
import { adminTableRowClass } from "@/lib/admin-table-classes";
import type { ProductFooterOption } from "@/lib/products-admin-types";
import { ProductTypeFormFields } from "@/components/settings/product-type-form-fields";

export type ProductTypeTreeRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  pathLabel: string;
  storefrontVisible: boolean;
  siblingCount: number;
  siblingIndex: number;
  _count: { products: number; defaultFooters: number };
};

export function ProductTypesAdmin({
  initialTreeRows,
  parentOptions,
  footers,
}: {
  initialTreeRows: ProductTypeTreeRow[];
  parentOptions: { id: string; pathLabel: string }[];
  footers: ProductFooterOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [footerIds, setFooterIds] = useState<string[]>([]);
  const [storefrontVisible, setStorefrontVisible] = useState(true);

  function toggleFooter(id: string) {
    setFooterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await createProductType({
          name,
          slug: slug.trim() || undefined,
          footerIds,
          storefrontVisible,
          parentId: parentId || null,
        });
        setName("");
        setSlug("");
        setParentId("");
        setFooterIds([]);
        setStorefrontVisible(true);
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not create type.");
      }
    });
  }

  function remove(id: string, label: string) {
    if (!window.confirm(`Delete type “${label}”? Products keep other types; this removes the type link.`)) return;
    startTransition(async () => {
      try {
        await deleteProductType(id);
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not delete.");
      }
    });
  }

  function move(typeId: string, direction: "up" | "down") {
    setErr(null);
    startTransition(async () => {
      try {
        await moveProductType(typeId, direction);
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not reorder.");
      }
    });
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-black text-palm">Product types</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink/75 dark:text-zinc-400">
          Build a hierarchy (e.g. Live Inverts → Isopods → Cubaris sp.). Assign the{" "}
          <strong>most specific (leaf)</strong> type on each product. Parent types group the store filters and apply
          their default footers, shipping exclusions, and related-item defaults to descendants. Configure per-type
          defaults when editing a type.
        </p>
        {initialTreeRows.length === 0 ? (
          <p className="text-ink/70">No types yet. Add one below — they power store filters and default footers.</p>
        ) : (
          <div className="admin-table-shell overflow-x-auto rounded border-2 border-palm">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b-2 border-palm bg-surf/50 font-bold text-palm dark:bg-zinc-800 dark:text-zinc-100">
                <tr>
                  <th className="w-14 px-2 py-2">Order</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Direct</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2">Footers</th>
                  <th className="px-3 py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {initialTreeRows.map((t) => (
                  <tr key={t.id} className={adminTableRowClass}>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-ink/60 dark:text-zinc-400">{t.siblingIndex + 1}</span>
                        {t.siblingCount > 1 ? (
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={pending || t.siblingIndex === 0}
                              onClick={() => move(t.id, "up")}
                              className="border border-palm-mid px-1.5 py-0.5 text-xs font-bold text-palm disabled:opacity-35 dark:border-zinc-600 dark:text-zinc-200"
                              title="Move up"
                              aria-label={`Move ${t.name} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={pending || t.siblingIndex >= t.siblingCount - 1}
                              onClick={() => move(t.id, "down")}
                              className="border border-palm-mid px-1.5 py-0.5 text-xs font-bold text-palm disabled:opacity-35 dark:border-zinc-600 dark:text-zinc-200"
                              title="Move down"
                              aria-label={`Move ${t.name} down`}
                            >
                              ↓
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-ink dark:text-zinc-100">
                      <span style={{ paddingLeft: `${t.depth * 1.25}rem` }}>{t.name}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs dark:text-zinc-300">{t.slug}</td>
                    <td className="px-3 py-2 dark:text-zinc-200">{t._count.products}</td>
                    <td className="px-3 py-2 text-xs dark:text-zinc-200">
                      {t.storefrontVisible ? "Visible" : "Hidden"}
                    </td>
                    <td className="px-3 py-2 dark:text-zinc-200">{t._count.defaultFooters}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/settings/products/types/${t.id}/edit`}
                          className="font-medium text-palm underline dark:text-emerald-300"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => remove(t.id, t.pathLabel)}
                          className="font-medium text-coral hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border-2 border-palm bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-palm">Add product type</h2>
        <form onSubmit={create} className="mt-4 space-y-4">
          <ProductTypeFormFields
            name={name}
            setName={setName}
            slug={slug}
            setSlug={setSlug}
            parentId={parentId}
            setParentId={setParentId}
            parentOptions={parentOptions}
            storefrontVisible={storefrontVisible}
            setStorefrontVisible={setStorefrontVisible}
            footerIds={footerIds}
            toggleFooter={toggleFooter}
            footers={footers}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Create type"}
            </button>
            {err ? <span className="text-sm text-coral">{err}</span> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
