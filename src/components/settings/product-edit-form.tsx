"use client";

import { adminFieldsetClass } from "@/lib/admin-surface-classes";
import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import { DEFAULT_SPECIES_LIST_SOURCE } from "@/lib/product-species-list";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { fetchDefaultShippingExclusionsForProductTypes } from "@/app/actions/product-type-shipping-defaults-admin";
import { createProduct, updateProduct } from "@/app/actions/products-admin";
import { RichTextOrHtmlEditor } from "@/components/rich-text-or-html-editor";
import type {
  ProductEditInitial,
  ProductFooterOption,
  ProductShippingOptionRef,
  ProductTypePickerGroup,
} from "@/lib/products-admin-types";
export type { ProductEditInitial } from "@/lib/products-admin-types";

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function emptyCreateDefaults(): Omit<ProductEditInitial, "id"> & { id: "" } {
  return {
    id: "",
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    basePriceCents: 0,
    quantity: 0,
    unlimitedQuantity: false,
    active: true,
    featured: false,
    onSale: false,
    inBreeding: false,
    speciesAutoAdd: false,
    speciesListSpecies: "",
    speciesListInsectType: "",
    speciesListMorphName: "",
    speciesListCommonName: "",
    speciesListSource: DEFAULT_SPECIES_LIST_SOURCE,
    saleEndsAt: "",
    typeIds: [],
    footerIds: [],
    variantPriceDisplay: "difference",
    excludedShippingOptionIds: [],
  };
}

export function ProductEditForm({
  initial,
  typePickerGroups,
  footers,
  shippingOptions = [],
  catalogMode = false,
  catalogFormId = "catalog-product-edit-form",
  onCatalogSave,
  onCatalogSaveAndClose,
  onPendingChange,
  onClear,
  onCancel,
}: {
  initial: ProductEditInitial | null;
  typePickerGroups: ProductTypePickerGroup[];
  footers: ProductFooterOption[];
  shippingOptions?: ProductShippingOptionRef[];
  /** Catalog panel: allow null initial = new product; show Clear / Cancel. */
  catalogMode?: boolean;
  /** Catalog form id for action buttons rendered below the pane. */
  catalogFormId?: string;
  /** Stay open after save; on create, parent opens the new product for variation pricing. */
  onCatalogSave?: (createdProductId?: string) => void;
  /** Save then close editor (catalog mode). */
  onCatalogSaveAndClose?: () => void;
  onPendingChange?: (pending: boolean) => void;
  onClear?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const base = initial ?? emptyCreateDefaults();
  const [name, setName] = useState(base.name);
  const [slug, setSlug] = useState(base.slug);
  const [shortDescription, setShortDescription] = useState(base.shortDescription);
  const [description, setDescription] = useState(base.description);
  const [basePrice, setBasePrice] = useState(
    initial ? centsToInput(initial.basePriceCents) : "",
  );
  const [quantity, setQuantity] = useState(base.quantity);
  const [unlimitedQuantity, setUnlimitedQuantity] = useState(base.unlimitedQuantity);
  const [active, setActive] = useState(base.active);
  const [featured, setFeatured] = useState(base.featured);
  const [onSale, setOnSale] = useState(base.onSale);
  const [inBreeding, setInBreeding] = useState(base.inBreeding);
  const [speciesAutoAdd, setSpeciesAutoAdd] = useState(base.speciesAutoAdd);
  const [speciesListSpecies, setSpeciesListSpecies] = useState(base.speciesListSpecies);
  const [speciesListInsectType, setSpeciesListInsectType] = useState(base.speciesListInsectType);
  const [speciesListMorphName, setSpeciesListMorphName] = useState(base.speciesListMorphName);
  const [speciesListCommonName, setSpeciesListCommonName] = useState(base.speciesListCommonName);
  const [speciesListSource, setSpeciesListSource] = useState(base.speciesListSource);
  const [saleEndsAt, setSaleEndsAt] = useState(base.saleEndsAt);
  const [typeIds, setTypeIds] = useState<string[]>(base.typeIds);
  const [footerIds, setFooterIds] = useState<string[]>(base.footerIds);
  const [excludedShippingOptionIds, setExcludedShippingOptionIds] = useState<string[]>(
    base.excludedShippingOptionIds,
  );
  const typeIdsAtLoadRef = useRef(base.typeIds.join(","));

  useEffect(() => {
    if (!initial) {
      const d = emptyCreateDefaults();
      setName(d.name);
      setSlug(d.slug);
      setShortDescription(d.shortDescription);
      setDescription(d.description);
      setBasePrice("");
      setQuantity(d.quantity);
      setUnlimitedQuantity(d.unlimitedQuantity);
      setActive(d.active);
      setFeatured(d.featured);
      setOnSale(d.onSale);
      setInBreeding(d.inBreeding);
      setSpeciesAutoAdd(d.speciesAutoAdd);
      setSpeciesListSpecies(d.speciesListSpecies);
      setSpeciesListInsectType(d.speciesListInsectType);
      setSpeciesListMorphName(d.speciesListMorphName);
      setSpeciesListCommonName(d.speciesListCommonName);
      setSpeciesListSource(d.speciesListSource);
      setSaleEndsAt(d.saleEndsAt);
      setTypeIds(d.typeIds);
      setFooterIds(d.footerIds);
      setExcludedShippingOptionIds(d.excludedShippingOptionIds);
      typeIdsAtLoadRef.current = "";
      return;
    }
    setName(initial.name);
    setSlug(initial.slug);
    setShortDescription(initial.shortDescription);
    setDescription(initial.description);
    setBasePrice(centsToInput(initial.basePriceCents));
    setQuantity(initial.quantity);
    setUnlimitedQuantity(initial.unlimitedQuantity);
    setActive(initial.active);
    setFeatured(initial.featured);
    setOnSale(initial.onSale);
    setInBreeding(initial.inBreeding);
    setSpeciesAutoAdd(initial.speciesAutoAdd);
    setSpeciesListSpecies(initial.speciesListSpecies);
    setSpeciesListInsectType(initial.speciesListInsectType);
    setSpeciesListMorphName(initial.speciesListMorphName);
    setSpeciesListCommonName(initial.speciesListCommonName);
    setSpeciesListSource(initial.speciesListSource);
    setSaleEndsAt(initial.saleEndsAt);
    setTypeIds(initial.typeIds);
    setFooterIds(initial.footerIds);
    setExcludedShippingOptionIds(initial.excludedShippingOptionIds);
    typeIdsAtLoadRef.current = initial.typeIds.join(",");
  }, [initial]);

  useEffect(() => {
    const key = typeIds.join(",");
    if (key === typeIdsAtLoadRef.current) return;

    if (typeIds.length === 0) {
      setExcludedShippingOptionIds([]);
      return;
    }

    let cancelled = false;
    void fetchDefaultShippingExclusionsForProductTypes(typeIds).then((ids) => {
      if (!cancelled) setExcludedShippingOptionIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [typeIds]);

  function toggleType(id: string) {
    setTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleFooter(id: string) {
    setFooterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleExcludedShippingOption(id: string) {
    setExcludedShippingOptionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : "save";
    const closeAfter = action === "save-close";

    startTransition(async () => {
      if (!initial) {
        const result = await createProduct({
          name,
          slug: slug.trim() || undefined,
          shortDescription,
          description,
          basePrice: "",
          quantity: 0,
          unlimitedQuantity: false,
          active,
          featured,
          onSale,
          inBreeding,
          speciesAutoAdd,
          speciesListSpecies,
          speciesListInsectType,
          speciesListMorphName,
          speciesListCommonName,
          speciesListSource,
          saleEndsAt,
          typeIds,
          footerIds,
          excludedShippingOptionIds,
        });
        if (!result.ok) {
          setErr(result.error);
          return;
        }
        if (catalogMode) {
          if (closeAfter) {
            onCatalogSaveAndClose?.();
          } else {
            setMsg("Created. Set price and stock in Variation Control below.");
            onCatalogSave?.(result.id);
          }
          return;
        }
        setMsg("Created.");
        router.refresh();
        return;
      }

      const result = await updateProduct({
        id: initial.id,
        name,
        slug: slug.trim() || undefined,
        shortDescription,
        description,
        basePrice,
        quantity: unlimitedQuantity ? 0 : quantity,
        unlimitedQuantity,
        active,
        featured,
        onSale,
        inBreeding,
        speciesAutoAdd,
        speciesListSpecies,
        speciesListInsectType,
        speciesListMorphName,
        speciesListCommonName,
        speciesListSource,
        saleEndsAt,
        typeIds,
        footerIds,
        excludedShippingOptionIds,
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      if (catalogMode) {
        if (closeAfter) {
          onCatalogSaveAndClose?.();
        } else {
          setMsg("Saved.");
          if (result.slug !== slug) {
            setSlug(result.slug);
          }
          onCatalogSave?.();
        }
        return;
      }
      setMsg("Saved.");
      if (result.slug !== slug) {
        setSlug(result.slug);
      }
      router.refresh();
    });
  }

  function handleClear() {
    setMsg(null);
    setErr(null);
    onClear?.();
  }

  function handleCancel() {
    setMsg(null);
    setErr(null);
    onCancel?.();
  }

  const isEdit = !!initial;

  return (
    <form
      id={catalogMode ? catalogFormId : undefined}
      onSubmit={submit}
      className="space-y-4"
    >
      <label className="flex items-start gap-2 text-sm font-bold text-ink">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-1" />
        <span>
          Active (visible on store){" "}
          <span className="block text-xs font-normal text-ink/65">Off hides the product from the storefront and its URL.</span>
        </span>
      </label>

      <label className="block text-sm font-bold text-ink">
        Name <span className="text-coral">*</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        URL slug {catalogMode && !isEdit ? "(optional)" : null}
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm"
          placeholder={catalogMode && !isEdit ? "auto from name" : undefined}
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        Short description
        <input
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
        />
      </label>
      <RichTextOrHtmlEditor
        key={initial?.id ?? "new-product"}
        label="Full description"
        value={description}
        onChange={setDescription}
        minHeightClassName="min-h-[9rem]"
        placeholder="Product details. New paragraph: Enter. Line break: Shift+Enter."
      />
      {!isEdit ? (
        <p className="text-sm text-ink/75 dark:text-zinc-400">
          Save to create the product, then set <strong>price, stock, and images</strong> in{" "}
          <strong>Variation Control</strong> below (no price required here).
        </p>
      ) : (
        <p className="text-sm text-ink/75 dark:text-zinc-400">
          Edit <strong>list price, quantity, and options</strong> in <strong>Variation Control</strong> below. This form
          updates title, copy, and catalog settings only.
        </p>
      )}
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" checked={onSale} onChange={(e) => setOnSale(e.target.checked)} />
        On sale
      </label>
      <label className="flex items-center gap-2 text-sm font-bold text-ink">
        <input type="checkbox" checked={inBreeding} onChange={(e) => setInBreeding(e.target.checked)} />
        In breeding
      </label>
      <p className="-mt-2 text-xs text-ink/60">
        Breeding items are not for sale. Cards show &ldquo;Breeding in Progress&rdquo; instead of out-of-stock.
      </p>
      <fieldset className={adminFieldsetClass}>
        <legend className="text-sm font-bold text-ink">Species list (on purchase)</legend>
        <p className="mb-3 text-xs text-ink/60">
          When enabled, signed-in customers can add this product to their species list at checkout (default on). One
          product maps to one species + morph; quantity tiers share the same mapping.
        </p>
        <label className="flex items-start gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            checked={speciesAutoAdd}
            onChange={(e) => setSpeciesAutoAdd(e.target.checked)}
            className="mt-1"
          />
          <span>Auto-add on purchase</span>
        </label>
        {speciesAutoAdd ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-ink sm:col-span-2">
              Species <span className="text-coral">*</span>
              <input
                value={speciesListSpecies}
                onChange={(e) => setSpeciesListSpecies(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="e.g. Armadillidium maculatum"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Insect type
              <input
                value={speciesListInsectType}
                onChange={(e) => setSpeciesListInsectType(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="e.g. Isopod"
              />
            </label>
            <label className="block text-sm font-bold text-ink">
              Morph name
              <input
                value={speciesListMorphName}
                onChange={(e) => setSpeciesListMorphName(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="e.g. Zebra"
              />
            </label>
            <label className="block text-sm font-bold text-ink sm:col-span-2">
              Common name
              <input
                value={speciesListCommonName}
                onChange={(e) => setSpeciesListCommonName(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                placeholder="e.g. Zebra Isopod"
              />
            </label>
            <label className="block text-sm font-bold text-ink sm:col-span-2">
              Source
              <input
                value={speciesListSource}
                onChange={(e) => setSpeciesListSource(e.target.value)}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}
      </fieldset>
      {onSale ? (
        <label className="block text-sm font-bold text-ink">
          Sale ends (optional)
          <input
            type="datetime-local"
            value={saleEndsAt.length >= 16 ? saleEndsAt.slice(0, 16) : saleEndsAt}
            onChange={(e) => setSaleEndsAt(e.target.value)}
            className="mt-1 w-full max-w-xs border-2 border-palm-mid px-2 py-2 text-sm"
          />
        </label>
      ) : null}
      {typePickerGroups.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-bold text-ink">Product type (most specific)</legend>
          <p className="mb-2 text-xs text-ink/60">
            Choose the most specific type for this product. Options are grouped by their parent category.
          </p>
          <div className="mt-3 space-y-4">
            {typePickerGroups.map((group) => (
              <div
                key={group.key}
                className="rounded border border-palm/20 bg-surf/30 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900/40"
              >
                <p className="text-xs font-black uppercase tracking-wide text-palm dark:text-emerald-300">
                  {group.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {group.options.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-ink dark:text-zinc-200">
                      <input
                        type="checkbox"
                        checked={typeIds.includes(t.id)}
                        onChange={() => toggleType(t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}
      {footers.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-bold text-ink">Extra footers (optional)</legend>
          <p className="mb-2 text-xs text-ink/60">In addition to defaults from selected types.</p>
          <div className="flex flex-wrap gap-3">
            {footers.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={footerIds.includes(f.id)} onChange={() => toggleFooter(f.id)} />
                {f.title}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className={adminFieldsetClass}>
        <legend className="px-1 text-sm font-bold text-ink dark:text-zinc-100">Shipping exclusions (admin only)</legend>
        <p className="mb-3 text-xs text-ink/60 dark:text-zinc-400">
          Applies to all variations of this product. Set shipping units per variation in the pricing table below.
          Selecting product types above applies each type&apos;s default exclusions (configure under{" "}
          <Link href="/settings/products/types" className="font-medium text-lagoon-dark underline dark:text-emerald-400">
            Product types
          </Link>
          ).
        </p>
        {shippingOptions.length > 0 ? (
          <div>
            <p className="text-sm font-bold text-ink">Cannot ship in these boxes</p>
            <p className="mb-2 text-xs text-ink/60">
              Leave all unchecked if this item can use any box that has enough capacity (e.g. too long for a small flat
              rate).
            </p>
            <div className="flex flex-wrap gap-3">
              {shippingOptions.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={excludedShippingOptionIds.includes(opt.id)}
                    onChange={() => toggleExcludedShippingOption(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink/60">
            Add shipping options under{" "}
            <Link href="/settings/shipping" className="font-medium text-lagoon-dark underline">
              Settings → Shipping
            </Link>{" "}
            to exclude specific boxes for this product.
          </p>
        )}
      </fieldset>
      {catalogMode ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
          {err ? <span className="text-sm text-coral">{err}</span> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button type="submit" disabled={pending} className={btnSecondaryMd}>
            {pending ? "Saving…" : isEdit ? "Save product" : "Create product"}
          </button>
          <Link href="/settings/products" className="text-sm font-medium text-lagoon-dark underline">
            ← Catalog
          </Link>
          {slug.trim() ? (
            <Link
              href={`/product/${slug.trim()}`}
              className="text-sm font-medium text-lagoon-dark underline"
              target="_blank"
              rel="noreferrer"
            >
              View live
            </Link>
          ) : (
            <span className="text-sm text-ink/50">Add a slug to open the live page</span>
          )}
          {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
          {err ? <span className="text-sm text-coral">{err}</span> : null}
        </div>
      )}
    </form>
  );
}
