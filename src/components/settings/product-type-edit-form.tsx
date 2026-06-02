"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProductType } from "@/app/actions/product-types-admin";
import type { ProductFooterOption } from "@/lib/products-admin-types";
import { ProductTypeFormFields } from "@/components/settings/product-type-form-fields";

export function ProductTypeEditForm({
  typeId,
  initialName,
  initialSlug,
  initialParentId,
  initialStorefrontVisible,
  initialFooterIds,
  parentOptions,
  footers,
}: {
  typeId: string;
  initialName: string;
  initialSlug: string;
  initialParentId: string | null;
  initialStorefrontVisible: boolean;
  initialFooterIds: string[];
  parentOptions: { id: string; pathLabel: string }[];
  footers: ProductFooterOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [parentId, setParentId] = useState(initialParentId ?? "");
  const [footerIds, setFooterIds] = useState<string[]>(initialFooterIds);
  const [storefrontVisible, setStorefrontVisible] = useState(initialStorefrontVisible);

  function toggleFooter(id: string) {
    setFooterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        await updateProductType(typeId, {
          name,
          slug: slug.trim() || undefined,
          footerIds,
          storefrontVisible,
          parentId: parentId || null,
        });
        setMsg("Saved.");
        router.refresh();
      } catch (ex) {
        setErr(ex instanceof Error ? ex.message : "Could not save.");
      }
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <ProductTypeFormFields
        name={name}
        setName={setName}
        slug={slug}
        setSlug={setSlug}
        parentId={parentId}
        setParentId={setParentId}
        parentOptions={parentOptions}
        excludeTypeId={typeId}
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
          {pending ? "Saving…" : "Save type"}
        </button>
        <Link href="/settings/products/types" className="text-sm font-medium text-lagoon-dark underline">
          ← Back to types
        </Link>
        {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
        {err ? <span className="text-sm text-coral">{err}</span> : null}
      </div>
    </form>
  );
}
