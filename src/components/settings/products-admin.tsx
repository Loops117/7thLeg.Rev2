"use client";

import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";
import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnChip, btnChipActive, btnSecondaryMd } from "@/lib/btn-theme-classes";
import { ProductTypeIndex, type ProductTypeFlat } from "@/lib/product-type-index";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { exportSelectedProductsCatalogCsv } from "@/app/actions/product-catalog-import-export";
import {
  bulkDeleteProducts,
  bulkSetProductsActive,
  deleteProduct,
  quickRestockProduct,
  setProductActive,
} from "@/app/actions/products-admin";
import type { ProductCatalogEditPayload } from "@/lib/product-catalog-edit-types";
import { ProductCatalogActionsMenu } from "@/components/settings/product-catalog-actions-menu";
import { ProductCatalogCsvPanel } from "@/components/settings/product-catalog-csv-panel";
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
  const [catalogPaneOpen, setCatalogPaneOpen] = useState(() => !editPayload);
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
  const [formPending, setFormPending] = useState(false);

  const [multiMode, setMultiMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");

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
      setCatalogPaneOpen(false);
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
        setCatalogPaneOpen(true);
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
    if (closePane) {
      setPaneEditorOpen(false);
      setCatalogPaneOpen(true);
    }
    if (leaveUrl && editIdFromUrl) {
      router.replace("/settings/products");
    }
  }

  function openEditorPane(opts?: { newProduct?: boolean }) {
    editorDismissedRef.current = opts?.newProduct === true;
    if (opts?.newProduct) {
      loadedFromUrlRef.current = null;
      setEditorInitial(null);
      setEditorMedia(undefined);
      setEditorRecommendations(undefined);
      setEditorKit(undefined);
      setFormEpoch((n) => n + 1);
      if (editIdFromUrl) {
        router.replace("/settings/products");
      }
    }
    setPaneEditorOpen(true);
    setCatalogPaneOpen(false);
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

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((p) => selectedIds.has(p.id));
  const someFilteredSelected = selectedCount > 0 && !allFilteredSelected;

  function toggleMultiMode() {
    setMultiMode((on) => {
      if (on) setSelectedIds(new Set());
      return !on;
    });
    setBulkMsg("");
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of filteredRows) next.delete(p.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const p of filteredRows) next.add(p.id);
        return next;
      });
    }
  }

  function downloadCsv(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function runBulkAction(action: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setBulkMsg("Select at least one product.");
      return;
    }
    setBulkMsg("");

    if (action === "delete") {
      setDeletePassword("");
      setDeletePasswordError("");
      setDeleteDialogOpen(true);
      return;
    }

    startTransition(async () => {
      if (action === "export") {
        const r = await exportSelectedProductsCatalogCsv(ids);
        if (!r.ok) {
          setBulkMsg(r.error);
          return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        downloadCsv(r.csv, `products-selected-${stamp}.csv`);
        setBulkMsg(`Exported ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
        return;
      }
      if (action === "activate" || action === "deactivate") {
        const r = await bulkSetProductsActive(ids, action === "activate");
        if (!r.ok) {
          setBulkMsg(r.error);
          return;
        }
        setBulkMsg(
          `Set ${r.updated} product${r.updated === 1 ? "" : "s"} as ${action === "activate" ? "active" : "inactive"}.`,
        );
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  }

  function confirmBulkDelete() {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setDeleteDialogOpen(false);
      return;
    }
    if (!deletePassword.trim()) {
      setDeletePasswordError("Enter your password.");
      return;
    }
    setDeletePasswordError("");
    startTransition(async () => {
      const r = await bulkDeleteProducts(ids, deletePassword);
      if (!r.ok) {
        setDeletePasswordError(r.error);
        return;
      }
      setDeleteDialogOpen(false);
      setDeletePassword("");
      setSelectedIds(new Set());
      setRows((prev) => prev.filter((row) => !ids.includes(row.id) || r.failures.some((f) => f.id === row.id)));
      if (editIdFromUrl && ids.includes(editIdFromUrl) && r.deleted > 0) {
        router.replace("/settings/products");
      }
      const parts = [`Deleted ${r.deleted} product${r.deleted === 1 ? "" : "s"}.`];
      if (r.failures.length > 0) {
        parts.push(
          `${r.failures.length} could not be deleted: ${r.failures.map((f) => `${f.name} (${f.error})`).join("; ")}`,
        );
      }
      setBulkMsg(parts.join(" "));
      router.refresh();
    });
  }

  function handleCatalogSaveAndClose() {
    resetEditorState({ closePane: true, leaveUrl: true });
    router.replace("/settings/products");
    router.refresh();
  }

  function handleCatalogSave(createdProductId?: string) {
    editorDismissedRef.current = false;
    setPaneEditorOpen(true);
    setCatalogPaneOpen(false);
    if (createdProductId) {
      router.push(`/settings/products?edit=${encodeURIComponent(createdProductId)}`);
    }
    router.refresh();
  }

  function handleClear() {
    resetEditorState({ closePane: false, leaveUrl: true });
    openEditorPane({ newProduct: true });
  }

  function handleCancel() {
    resetEditorState({ closePane: true, leaveUrl: true });
  }

  function openEditorForProduct(id: string) {
    openEditorPane();
    router.push(`/settings/products?edit=${encodeURIComponent(id)}`);
  }

  function openNewProduct() {
    openEditorPane({ newProduct: true });
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
          const open = e.currentTarget.open;
          setPaneEditorOpen(open);
          if (open) setCatalogPaneOpen(false);
        }}
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm dark:text-emerald-300 sm:px-6 dark:border-zinc-700">
          Add or edit product
          <span className="mt-1 block text-xs font-normal text-ink/65">
            Use <strong>Create product</strong> or double-click a catalog row. Variation Control and images appear after
            the first save.
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
            onCatalogSave={handleCatalogSave}
            onCatalogSaveAndClose={handleCatalogSaveAndClose}
            onPendingChange={setFormPending}
            onClear={handleClear}
            onCancel={handleCancel}
          />
          {editorInitial?.id && editorRecommendations ? (
            <ProductRecommendationsEditor
              key={`rec-${editorInitial.id}`}
              productId={editorInitial.id}
              initialRelated={editorRecommendations.related}
              initialYouMayAlsoWant={editorRecommendations.youMayAlsoWant}
              inheritedFromTypes={editorRecommendations.fromTypes}
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

          <div className="sticky bottom-0 z-10 -mx-4 border-t-2 border-palm/20 bg-surf/95 px-4 py-4 backdrop-blur-sm sm:-mx-6 sm:px-6 dark:border-zinc-700 dark:bg-zinc-900/95">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                form="catalog-product-edit-form"
                value="save"
                disabled={formPending}
                className={btnSecondaryMd}
              >
                Save
              </button>
              <button
                type="submit"
                form="catalog-product-edit-form"
                value="save-close"
                disabled={formPending}
                className={btnSecondaryMd}
              >
                Save &amp; Close
              </button>
              <button type="button" onClick={handleClear} className={btnSecondaryMd}>
                Clear
              </button>
              <button type="button" onClick={handleCancel} className={btnSecondaryMd}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </details>

      <details
        open={catalogPaneOpen}
        onToggle={(e) => {
          if (e.target !== e.currentTarget) return;
          const open = e.currentTarget.open;
          setCatalogPaneOpen(open);
          if (open) setPaneEditorOpen(false);
        }}
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm dark:text-emerald-300 sm:px-6 dark:border-zinc-700">
          Catalog
          <span className="mt-1 block text-xs font-normal text-ink/65">
            {rows.length} product{rows.length === 1 ? "" : "s"} — search and filter the table.
          </span>
        </summary>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={openNewProduct} className={btnSecondaryMd}>
              Create product
            </button>
            <span className="text-xs text-ink/60 dark:text-zinc-400">
              Opens the editor above. Double-click a row to edit.
            </span>
          </div>

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
            <div className="overflow-hidden rounded border-2 border-palm dark:border-zinc-600">
              <div className="flex flex-wrap items-center justify-end gap-2 border-b-2 border-palm/20 bg-surf/60 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
                {multiMode ? (
                  <>
                    <label className="sr-only" htmlFor="catalog-bulk-action">
                      Bulk action
                    </label>
                    <select
                      id="catalog-bulk-action"
                      defaultValue=""
                      disabled={pending || selectedCount === 0}
                      onChange={(e) => {
                        const v = e.target.value;
                        e.target.value = "";
                        if (v) runBulkAction(v);
                      }}
                      className="min-w-[10rem] border-2 border-palm-mid bg-white px-2 py-1.5 text-sm font-bold dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="">Action…</option>
                      <option value="export">Export all</option>
                      <option value="deactivate">Set as Inactive</option>
                      <option value="activate">Set as Active</option>
                      <option value="delete">Delete</option>
                    </select>
                    {selectedCount > 0 ? (
                      <span className="text-xs text-ink/60 dark:text-zinc-400">{selectedCount} selected</span>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={toggleMultiMode}
                  className={multiMode ? btnChipActive : btnChip}
                >
                  Multi
                </button>
              </div>
              <div className="min-h-[32rem] max-h-[calc(100dvh-9rem)] overflow-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b-2 border-palm bg-surf/90 font-bold text-palm backdrop-blur-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100">
                  <tr>
                    {multiMode ? (
                      <th className="w-10 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someFilteredSelected;
                          }}
                          onChange={toggleAllFiltered}
                          aria-label={allFilteredSelected ? "Unselect all visible" : "Select all visible"}
                          className="h-4 w-4 accent-palm"
                        />
                      </th>
                    ) : null}
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
                      className={`${adminTableRowClass} ${multiMode ? "" : "cursor-pointer"} [&_button]:dark:text-zinc-200 [&_a]:dark:text-emerald-300`}
                      onDoubleClick={multiMode ? undefined : () => openEditorForProduct(p.id)}
                      title={multiMode ? undefined : "Double-click to edit"}
                    >
                      {multiMode ? (
                        <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelected(p.id)}
                            aria-label={`Select ${p.name}`}
                            className="h-4 w-4 accent-palm"
                          />
                        </td>
                      ) : null}
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
            </div>
          )}

          {bulkMsg ? (
            <p className="text-sm text-ink/85 dark:text-zinc-300" role="status">
              {bulkMsg}
            </p>
          ) : null}

          {deleteDialogOpen ? (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/55 p-4"
              role="presentation"
              onClick={() => {
                if (!pending) setDeleteDialogOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-delete-title"
                className="w-full max-w-md rounded-xl border-2 border-palm bg-white p-5 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="bulk-delete-title" className="text-lg font-black text-coral">
                  Delete {selectedCount} product{selectedCount === 1 ? "" : "s"}?
                </h2>
                <p className="mt-2 text-sm text-ink/80 dark:text-zinc-300">
                  This permanently removes the selected items from the catalog. Products on orders cannot be deleted —
                  deactivate those instead. Enter your admin password to continue.
                </p>
                <label className="mt-4 block text-sm font-bold text-ink dark:text-zinc-200">
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeletePasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmBulkDelete();
                    }}
                    className="mt-1 w-full border-2 border-palm-mid px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </label>
                {deletePasswordError ? (
                  <p className="mt-2 text-sm font-medium text-coral">{deletePasswordError}</p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleteDialogOpen(false)}
                    className={btnSecondaryMd}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={confirmBulkDelete}
                    className="rounded border-2 border-coral bg-coral px-4 py-2 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-50"
                  >
                    {pending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {typePickerGroups.length === 0 ? (
            <p className="text-sm text-ink/60">
              No product types yet. Add them under{" "}
              <Link href="/settings/products/types" className="font-medium text-lagoon-dark underline">
                Product types
              </Link>
              .
            </p>
          ) : null}

          <details
            className="rounded border-2 border-palm/25 bg-surf/30 dark:border-zinc-600 dark:bg-zinc-900/30 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
            onToggle={(e) => e.stopPropagation()}
          >
            <summary className="px-4 py-3 text-sm font-black text-palm dark:text-emerald-300 sm:px-5">
              Bulk export / import
              <span className="mt-0.5 block text-xs font-normal text-ink/60 dark:text-zinc-400">
                CSV templates, export catalog, import products or extra variations (collapsed by default).
              </span>
            </summary>
            <div className="border-t-2 border-palm/15 px-4 py-4 sm:px-5 dark:border-zinc-700">
              <ProductCatalogCsvPanel />
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
