"use client";

import Link from "next/link";
import type { ProductFooterOption } from "@/lib/products-admin-types";

export function ProductTypeFormFields({
  name,
  setName,
  slug,
  setSlug,
  parentId,
  setParentId,
  parentOptions,
  excludeTypeId,
  storefrontVisible,
  setStorefrontVisible,
  footerIds,
  toggleFooter,
  footers,
  nameRequired = true,
}: {
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  parentId: string;
  setParentId: (v: string) => void;
  parentOptions: { id: string; pathLabel: string }[];
  /** When editing, omit self (and descendants) from parent choices. */
  excludeTypeId?: string;
  storefrontVisible: boolean;
  setStorefrontVisible: (v: boolean) => void;
  footerIds: string[];
  toggleFooter: (id: string) => void;
  footers: ProductFooterOption[];
  nameRequired?: boolean;
}) {
  const parentChoices = parentOptions.filter((p) => p.id !== excludeTypeId);

  return (
    <>
      <label className="flex items-start gap-2 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={storefrontVisible}
          onChange={(e) => setStorefrontVisible(e.target.checked)}
          className="mt-1"
        />
        <span>
          Show on storefront{" "}
          <span className="block text-xs font-normal text-ink/65">
            Off = hidden from store type filters and from public type breadcrumbs on product pages. You can still use
            the type for grouping and default footers.
          </span>
        </span>
      </label>
      <label className="block text-sm font-bold text-ink">
        Parent type (optional)
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="mt-1 w-full max-w-md border-2 border-palm-mid bg-white px-2 py-2 text-sm"
        >
          <option value="">— Top level (no parent) —</option>
          {parentChoices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pathLabel}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-ink">
        Name {nameRequired ? <span className="text-coral">*</span> : null}
        <input
          required={nameRequired}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-bold text-ink">
        URL slug (optional)
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full border-2 border-palm-mid px-2 py-2 font-mono text-sm"
          placeholder="auto from name"
        />
      </label>
      {footers.length === 0 ? (
        <p className="text-sm text-ink/60">
          No footers yet. Create reusable blocks under{" "}
          <Link href="/settings/products/footers" className="text-lagoon-dark underline">
            Product footers
          </Link>{" "}
          first, then attach them here as defaults for this type.
        </p>
      ) : (
        <fieldset>
          <legend className="text-sm font-bold text-ink">Default product footers</legend>
          <p className="mb-2 text-xs text-ink/60">
            These HTML blocks appear at the bottom of product pages for every product with this type or a more specific
            child type (plus any extra footers chosen on the product).
          </p>
          <div className="flex flex-wrap gap-3">
            {footers.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={footerIds.includes(f.id)}
                  onChange={() => toggleFooter(f.id)}
                />
                {f.title}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}
