"use client";

import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";
import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnChip, btnChipActive } from "@/lib/btn-theme-classes";
import { ProductTypeIndex, type ProductTypeFlat } from "@/lib/product-type-index";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteProduct, quickRestockProduct, setProductActive } from "@/app/actions/products-admin";
import type { ProductCatalogEditPayload } from "@/lib/product-catalog-edit-types";
import { ProductCatalogActionsMenu } from "@/components/settings/product-catalog-actions-menu";
import { ProductEditForm } from "@/components/settings/product-edit-form";
import { ProductEditMedia } from "@/components/settings/product-edit-media";
import { ProductRecommendationsEditor } from "@/components/settings/product-recommendations-editor";
import { ProductKitEditor } from "@/components/settings/product-kit-editor";
import type { ProductPickerOption } from "@/lib/product-picker-option";
import { formatPriceUsd } from "@/lib/product-slug";
import type {
  ProductEditInitial,
  ProductFooterOption,
  ProductListRow,
  ProductTypePickerGroup,
} from "@/lib/products-admin-types";

type QuickFilter = "all" | "active" | "inactive" | "featured" | "sale";

export function ProductsAdminPanel({
  initialProducts,
  typePickerGroups,
  filterTypes,
  typeHierarchy,
  footers,
  shippingOptions,
  editPayload,
  editIdFromUrl,
  editNotFound,
}: {
  initialProducts: ProductListRow[];
  typePickerGroups: ProductTypePickerGroup[];
  filterTypes: { id: string; pathLabel: string }[];
  typeHierarchy: ProductTypeFlat[];
  footers: ProductFooterOption[];
  shippingOptions: { id: string; label: string }[];
  editPayload: ProductCatalogEditPayload | null;
  editIdFromUrl: string | null;
  editNotFound?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialProducts);
  const [paneEditorOpen, setPaneEditorOpen] = useState(() => !!editPayload);
  const [editorInitial, setEditorInitial] = useState<ProductEditInitial | null>(() =>
    editPayload ? editPayload.initial : null,
  );
  const [editorMedia, setEditorMedia] = useState<ProductCatalogEditPayload["media"] | undefined>(() =>
    editPayload?.media,
  );
  const [editorRecommendations, setEditorRecommendations] = useState<
    ProductCatalogEditPayload["recommendations"] | undefined
  >(() => editPayload?.recommendations);
  const [editorKit, setEditorKit] = useState<ProductCatalogEditPayload["kit"] | undefined>(
    () => editPayload?.kit,
  );
  const loadedFromUrlRef = useRef<string | null>(editPayload ? editPayload.initial.id : null);
  /** Bumped to remount the form after Clear; blocks stale editPayload from repopulating after Cancel. */
  const [formEpoch, setFormEpoch] = useState(0);
  const editorDismissedRef = useRef(false);

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [typeFilterId, setTypeFilterId] = useState<string>("");

  const [pending, startTransition] = useTransition();

  const typeFilterIndex = useMemo(() => new ProductTypeIndex(typeHierarchy), [typeHierarchy]);
  const typeFilterMatchIds = useMemo(() => {
    if (!typeFilterId) return null;
    return new Set(typeFilterIndex.descendantsOf(typeFilterId));
  }, [typeFilterId, typeFilterIndex]);

  useEffect(() => {
    setRows(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (editPayload) {
      if (editorDismissedRef.current) return;
      loadedFromUrlRef.current = editPayload.initial.id;
      setEditorInitial(editPayload.initial);
      setEditorMedia(editPayload.media);
      setEditorRecommendations(editPayload.recommendations);
      setEditorKit(editPayload.kit);
      setPaneEditorOpen(true);
      return;
    }
    if (editIdFromUrl === null) {
      editorDismissedRef.current = false;
      if (loadedFromUrlRef.current !== null) {
        loadedFromUrlRef.current = null;
        setEditorInitial(null);
        setEditorMedia(undefined);
        setEditorRecommendations(undefined);
        setEditorKit(undefined);
        setPaneEditorOpen(false);
      }
    }
  }, [editPayload, editIdFromUrl]);

  function resetEditorState(opts: { closePane?: boolean; leaveUrl?: boolean } = {}) {
    const { closePane = true, leaveUrl = true } = opts;
    editorDismissedRef.current = true;
    loadedFromUrlRef.current = null;
    setEditorInitial(null);
    setEditorMedia(undefined);
    setEditorRecommendations(undefined);
    setEditorKit(undefined);
    setFormEpoch((n) => n + 1);
    if (closePane) setPaneEditorOpen(false);
    if (leaveUrl && editIdFromUrl) {
      router.replace("/settings/products");
    }
  }

  const filteredRows = useMemo(() => {
    let list = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
    }
    if (quickFilter === "active") list = list.filter((p) => p.active);
    if (quickFilter === "inactive") list = list.filter((p) => !p.active);
    if (quickFilter === "featured") list = list.filter((p) => p.featured);
    if (quickFilter === "sale") list = list.filter((p) => p.onSale);
    if (typeFilterMatchIds) {
      list = list.filter((p) => p.typeIds.some((tid) => typeFilterMatchIds.has(tid)));
    }
    return list;
  }, [rows, search, quickFilter, typeFilterMatchIds]);

  function handleCatalogSaved() {
    resetEditorState({ closePane: true, leaveUrl: true });
    router.replace("/settings/products");
    router.refresh();
  }

  function handleClear() {
    resetEditorState({ closePane: false, leaveUrl: true });
    setPaneEditorOpen(true);
  }

  function handleCancel() {
    resetEditorState({ closePane: true, leaveUrl: true });
  }

  function openEditorForProduct(id: string) {
    editorDismissedRef.current = false;
    router.push(`/settings/products?edit=${encodeURIComponent(id)}`);
  }

  function runRestock(productId: string) {
    const raw = window.prompt("Add to stock (negative subtracts). Whole numbers only.", "10");
    if (raw === null) return;
    const d = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(d) || d === 0) {
      window.alert("Enter a non-zero whole number.");
      return;
    }
    startTransition(async () => {
      await quickRestockProduct(productId, d);
      router.refresh();
    });
  }

  function runSetActive(productId: string, active: boolean) {
    startTransition(async () => {
      await setProductActive(productId, active);
      router.refresh();
    });
  }

  function runDelete(p: (typeof rows)[number]) {
    if (
      !window.confirm(
        `Permanently delete “${p.name}”?\n\nThis cannot be undone. If the product was ever on an order, deletion will be blocked.\n\nUse “Deactivate” to hide it from the store instead.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        setRows((prev) => prev.filter((row) => row.id !== p.id));
        if (editIdFromUrl === p.id) {
          router.replace("/settings/products");
        }
        router.refresh();
        return;
      }
      window.alert(r.error);
    });
  }

  const filterBtn = (id: QuickFilter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setQuickFilter(id)}
      className={quickFilter === id ? btnChipActive : btnChip}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {editNotFound ? (
        <p className="rounded border-2 border-coral/40 bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          No product matches that link. Open the catalog below or pick <strong>Edit</strong> from the actions menu.
        </p>
      ) : null}

      <details
        open={paneEditorOpen}
        onToggle={(e) => {
          if (e.target !== e.currentTarget) return;
          setPaneEditorOpen(e.currentTarget.open);
        }}
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm dark:text-emerald-300 sm:px-6 dark:border-zinc-700">
          Add or edit product
          <span className="mt-1 block text-xs font-normal text-ink/65">
            Collapsed by default. Expand to create a product or edit one from the catalog. Variations and images appear
            after the product exists.
          </span>
        </summary>
        <div className="space-y-4 p-4 sm:p-6">
          <ProductEditForm
            key={`${editorInitial?.id ?? "new"}-${formEpoch}`}
            initial={editorInitial}
            typePickerGroups={typePickerGroups}
            footers={footers}
            shippingOptions={shippingOptions}
            catalogMode
            onCatalogSaved={handleCatalogSaved}
            onClear={handleClear}
            onCancel={handleCancel}
          />
          {editorInitial?.id && editorRecommendations ? (
            <ProductRecommendationsEditor
              key={`rec-${editorInitial.id}`}
              productId={editorInitial.id}
              initialRelated={editorRecommendations.related}
              initialYouMayAlsoWant={editorRecommendations.youMayAlsoWant}
            />
          ) : null}
          {editorInitial?.id && editorKit ? (
            <ProductKitEditor
                key={`kit-${editorInitial.id}`}
                hostProductId={editorInitial.id}
                hostProduct={{
                  id: editorInitial.id,
                  name: editorInitial.name,
                  slug: editorInitial.slug,
                  variants: (editorMedia?.variants ?? []).map(
                    (v): ProductPickerOption["variants"][number] => ({
                      id: v.id,
                      label: v.label,
                      active: v.active,
                    }),
                  ),
                }}
                initial={{
                  enabled: editorKit.enabled,
                  label: editorKit.label,
                  discountCents: editorKit.discountCents,
                  items: editorKit.items,
                }}
            />
          ) : null}
          {editorInitial?.id ? (
            <ProductEditMedia
              key={editorInitial.id}
              productId={editorInitial.id}
              basePriceCents={editorInitial.basePriceCents}
              variantPriceDisplay={editorInitial.variantPriceDisplay}
              initialMedia={editorMedia}
              onVariantPriceDisplaySaved={(mode) =>
                setEditorInitial((prev) => (prev ? { ...prev, variantPriceDisplay: mode } : prev))
              }
            />
          ) : null}
        </div>
      </details>

      <details
        open
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm dark:text-emerald-300 sm:px-6 dark:border-zinc-700">
          Catalog
          <span className="mt-1 block text-xs font-normal text-ink/65">
            {rows.length} product{rows.length === 1 ? "" : "s"} — search and filter the table.
          </span>
        </summary>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block min-w-[12rem] flex-1 text-sm font-bold text-ink">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or slug…"
                className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm"
              />
            </label>
            {filterTypes.length > 0 ? (
              <label className="block w-full min-w-[10rem] text-sm font-bold text-ink lg:max-w-xs">
                Type
                <select
                  value={typeFilterId}
                  onChange={(e) => setTypeFilterId(e.target.value)}
                  className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                >
                  <option value="">All types</option>
                  {filterTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.pathLabel}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {filterBtn("all", "All")}
            {filterBtn("active", "Active")}
            {filterBtn("inactive", "Inactive")}
            {filterBtn("featured", "Featured")}
            {filterBtn("sale", "On sale")}
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-ink/70">No products yet. Expand the panel above to add your first one.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-ink/70">Nothing matches these filters. Try clearing search or filters.</p>
          ) : (
            <div className="min-h-[32rem] max-h-[calc(100dvh-9rem)] overflow-auto rounded border-2 border-palm dark:border-zinc-600">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b-2 border-palm bg-surf/90 font-bold text-palm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Slug</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Flags</th>
                    <th className="w-12 px-2 py-2 text-center" aria-label="Actions column">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((p) => (
                    <tr
                      key={p.id}
                      className={`${adminTableRowClass} [&_button]:dark:text-zinc-200 [&_a]:dark:text-emerald-300`}
                    >
                      <td className="px-3 py-2 font-medium text-ink">{p.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink/80">{p.slug}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatPriceUsd(p.listPriceCents)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {p.unlimitedQuantity ? (
                          <span className="font-semibold text-lagoon-dark" title="Unlimited (made to order)">
                            ∞
                          </span>
                        ) : (
                          p.quantity
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full border-2 px-2 py-0.5 text-xs font-bold ${
                            p.active
                              ? "border-lagoon-dark/40 bg-lagoon-dark/10 text-lagoon-dark"
                              : "border-ink/20 bg-ink/5 text-ink/60"
                          }`}
                        >
                          {p.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-ink/70">
                        {p.featured ? "Featured " : ""}
                        {p.onSale ? "Sale " : ""}
                        {!p.featured && !p.onSale ? "—" : ""}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <ProductCatalogActionsMenu
                          productName={p.name}
                          pending={pending}
                          active={p.active}
                          viewHref={`/product/${p.slug}`}
                          onRestock={() => runRestock(p.id)}
                          onToggleActive={() => runSetActive(p.id, !p.active)}
                          onEdit={() => openEditorForProduct(p.id)}
                          onDelete={() => runDelete(p)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {typePickerGroups.length === 0 ? (
            <p className="text-sm text-ink/60">
              No product types yet. Add them under{" "}
              <Link href="/settings/products/types" className="font-medium text-lagoon-dark underline">
                Product types
              </Link>
              .
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
