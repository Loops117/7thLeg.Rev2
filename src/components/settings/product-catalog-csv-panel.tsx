"use client";

import { btnSecondaryMd } from "@/lib/btn-theme-classes";
import {
  extraVariantsCatalogCsvTemplate,
  productsCatalogCsvTemplate,
} from "@/lib/product-catalog-csv";
import { csvWithUtf8Bom } from "@/lib/csv-text-encoding";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  exportExtraVariantsCatalogCsv,
  exportProductsCatalogCsv,
  importExtraVariantsCatalogCsv,
  importProductsCatalogCsv,
  type CatalogImportLogEntry,
  type CatalogImportResult,
} from "@/app/actions/product-catalog-import-export";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csvWithUtf8Bom(csv)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusClass(status: CatalogImportLogEntry["status"]): string {
  switch (status) {
    case "created":
      return "text-lagoon-dark dark:text-emerald-400";
    case "updated":
      return "text-palm dark:text-emerald-300";
    case "skipped":
      return "text-ink/70 dark:text-zinc-400";
    case "rejected":
      return "text-coral";
  }
}

function ImportSummary({ result, label }: { result: CatalogImportResult; label: string }) {
  return (
    <div className="rounded border-2 border-palm/25 bg-white/80 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-900/50">
      <p className="font-bold text-ink dark:text-zinc-100">{label}</p>
      <p className="mt-1 text-ink/80 dark:text-zinc-300">
        <span className="text-lagoon-dark dark:text-emerald-400">{result.created} created</span>
        {" · "}
        <span className="text-palm dark:text-emerald-300">{result.updated} updated</span>
        {" · "}
        <span>{result.skipped} skipped</span>
        {" · "}
        <span className="text-coral">{result.rejected} rejected</span>
      </p>
      {result.logs.length > 0 ? (
        <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
          {result.logs.map((entry, i) => (
            <li key={`${entry.row}-${entry.key}-${i}`} className={statusClass(entry.status)}>
              <span className="font-bold uppercase">{entry.status}</span> row {entry.row}{" "}
              {entry.key ? `(${entry.key})` : null}: {entry.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ProductCatalogCsvPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const productsImportRef = useRef<HTMLInputElement>(null);
  const variantsImportRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [productsResult, setProductsResult] = useState<CatalogImportResult | null>(null);
  const [variantsResult, setVariantsResult] = useState<CatalogImportResult | null>(null);

  function runExport(exportFn: () => Promise<{ ok: true; csv: string } | { ok: false; error: string }>, filename: string) {
    setError(null);
    startTransition(async () => {
      const r = await exportFn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      downloadCsv(r.csv, filename);
    });
  }

  function onProductsImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setProductsResult(null);
    const fd = new FormData();
    fd.set("file", f);
    startTransition(async () => {
      const r = await importProductsCatalogCsv(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setProductsResult(r);
      router.refresh();
    });
  }

  function onVariantsImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    setVariantsResult(null);
    const fd = new FormData();
    fd.set("file", f);
    startTransition(async () => {
      const r = await importExtraVariantsCatalogCsv(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setVariantsResult(r);
      router.refresh();
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink/70 dark:text-zinc-400">
        Two CSV types: <strong>products</strong> (one row per item + default variation, kit, types, etc.) and{" "}
        <strong>extra variations</strong> (additional options only). File names do not matter. Import products first;
        add extra variations when ready. Kit member products that are not in the catalog are skipped (logged). Images
        are not included. When saving from Excel, use <strong>CSV UTF-8 (Comma delimited) (*.csv)</strong> so symbols
        like ° and – stay correct.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => runExport(exportProductsCatalogCsv, `products-catalog-${stamp}.csv`)}
          className={btnSecondaryMd}
        >
          Export products CSV
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => runExport(exportExtraVariantsCatalogCsv, `extra-variations-${stamp}.csv`)}
          className={btnSecondaryMd}
        >
          Export extra variations CSV
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => downloadCsv(productsCatalogCsvTemplate(), "products-catalog-template.csv")}
          className="text-sm font-bold text-lagoon-dark underline dark:text-emerald-300"
        >
          Products template
        </button>
        <button
          type="button"
          onClick={() => downloadCsv(extraVariantsCatalogCsvTemplate(), "extra-variations-template.csv")}
          className="text-sm font-bold text-lagoon-dark underline dark:text-emerald-300"
        >
          Variations template
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => productsImportRef.current?.click()}
          className={btnSecondaryMd}
        >
          Import products CSV…
        </button>
        <input
          ref={productsImportRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onProductsImport}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => variantsImportRef.current?.click()}
          className={btnSecondaryMd}
        >
          Import extra variations CSV…
        </button>
        <input
          ref={variantsImportRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onVariantsImport}
        />
      </div>

      {pending ? <p className="mt-3 text-sm text-ink/65">Working…</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}
      {productsResult ? (
        <div className="mt-4">
          <ImportSummary result={productsResult} label="Products import" />
        </div>
      ) : null}
      {variantsResult ? (
        <div className="mt-4">
          <ImportSummary result={variantsResult} label="Extra variations import" />
        </div>
      ) : null}
    </div>
  );
}
