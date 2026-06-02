"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QrFrameShape, QrModuleShape, QrRedirectTarget, QrStyle } from "@/generated/prisma/enums";
import type {
  QrFrameShape as QrFrameShapeType,
  QrModuleShape as QrModuleShapeType,
  QrRedirectTarget as QrRedirectTargetType,
  QrStyle as QrStyleType,
} from "@/generated/prisma/enums";
import {
  clearQrDefaultCenterImageAction,
  clearQrRedirectOverrideCenterAction,
  createQrRedirectAction,
  deleteQrRedirectAction,
  updateQrRedirectAction,
  uploadQrDefaultCenterImageAction,
  uploadQrRedirectOverrideCenterAction,
} from "@/app/settings/(protected)/qr-codes/actions";
import { qrTargetLabel } from "@/lib/qr-redirect-url";

export type QrRow = {
  id: string;
  name: string;
  publicCode: string;
  target: QrRedirectTargetType;
  customUrl: string;
  visitCount: number;
  style: QrStyleType;
  moduleShape: QrModuleShapeType;
  frameShape: QrFrameShapeType;
  centerUseColor: boolean;
  centerImageUrl: string;
  createdAt: string;
};

function displayHostPath(origin: string, publicCode: string): string {
  try {
    const u = new URL(origin.includes("://") ? origin : `https://${origin}`);
    return `${u.host}/${publicCode}`;
  } catch {
    return `${origin.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/${publicCode}`;
  }
}

function formatVisits(n: number): string {
  return n.toString().padStart(4, "0");
}

function redirectSummary(row: QrRow): string {
  const label = qrTargetLabel(row.target);
  const c = row.customUrl.trim();
  if (c) {
    if (row.target === QrRedirectTarget.CUSTOM) return c;
    return `${label} (${c})`;
  }
  return label;
}

function shapeSummary(row: QrRow): string {
  const m =
    row.moduleShape === QrModuleShape.DOT
      ? "dots"
      : row.moduleShape === QrModuleShape.ROUNDED_SQUARE
        ? "rounded"
        : "square";
  const f = row.frameShape === QrFrameShape.CIRCLE ? "circle" : "square";
  return `${m} · ${f}`;
}

const TARGET_OPTIONS: { value: QrRedirectTargetType; label: string }[] = [
  { value: QrRedirectTarget.HOME, label: "Home page" },
  { value: QrRedirectTarget.STORE, label: "Store" },
  { value: QrRedirectTarget.FEATURED, label: "Featured" },
  { value: QrRedirectTarget.ABOUT, label: "About" },
  { value: QrRedirectTarget.CART, label: "Cart" },
  { value: QrRedirectTarget.ACCOUNT, label: "Account" },
  { value: QrRedirectTarget.CUSTOM, label: "Custom URL only" },
];

const STYLE_OPTIONS: { value: QrStyleType; label: string }[] = [
  { value: QrStyle.CLASSIC, label: "Classic (black on white)" },
  { value: QrStyle.SOFT, label: "Soft (forest on off-white)" },
  { value: QrStyle.INVERTED, label: "Inverted (white on black)" },
];

const MODULE_OPTIONS: { value: QrModuleShapeType; label: string }[] = [
  { value: QrModuleShape.SQUARE, label: "Square modules" },
  { value: QrModuleShape.DOT, label: "Dot modules" },
  { value: QrModuleShape.ROUNDED_SQUARE, label: "Rounded square modules" },
];

const FRAME_OPTIONS: { value: QrFrameShapeType; label: string }[] = [
  { value: QrFrameShape.SQUARE, label: "Square frame" },
  { value: QrFrameShape.CIRCLE, label: "Circular (transparent corners)" },
];

export function QrCodesAdminClient({
  initialRows,
  siteOrigin,
  defaultCenterImageUrl,
}: {
  initialRows: QrRow[];
  siteOrigin: string;
  defaultCenterImageUrl: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<QrRow[]>(initialRows);
  const [defaultCenter, setDefaultCenter] = useState(defaultCenterImageUrl.trim());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [target, setTarget] = useState<QrRedirectTargetType>(QrRedirectTarget.HOME);
  const [customUrl, setCustomUrl] = useState("");
  const [style, setStyle] = useState<QrStyleType>(QrStyle.CLASSIC);
  const [moduleShape, setModuleShape] = useState<QrModuleShapeType>(QrModuleShape.SQUARE);
  const [frameShape, setFrameShape] = useState<QrFrameShapeType>(QrFrameShape.SQUARE);
  const [centerUseColor, setCenterUseColor] = useState(false);
  const [centerImageUrl, setCenterImageUrl] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const defaultFileRef = useRef<HTMLInputElement | null>(null);
  const overrideFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDefaultCenter(defaultCenterImageUrl.trim());
  }, [defaultCenterImageUrl]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [rows]);

  function resetCreateForm() {
    setName("");
    setCustomUrl("");
    setTarget(QrRedirectTarget.HOME);
    setStyle(QrStyle.CLASSIC);
    setModuleShape(QrModuleShape.SQUARE);
    setFrameShape(QrFrameShape.SQUARE);
    setCenterUseColor(false);
    setCenterImageUrl("");
    setEditingId(null);
  }

  function startEdit(row: QrRow) {
    setEditingId(row.id);
    setName(row.name);
    setTarget(row.target);
    setCustomUrl(row.customUrl);
    setStyle(row.style);
    setModuleShape(row.moduleShape);
    setFrameShape(row.frameShape);
    setCenterUseColor(row.centerUseColor);
    setCenterImageUrl(row.centerImageUrl);
    setMessage(null);
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      if (editingId) {
        const res = await updateQrRedirectAction({
          id: editingId,
          name,
          target,
          customUrl,
          style,
          moduleShape,
          frameShape,
          centerUseColor,
          centerImageUrl,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setRows((prev) =>
          prev.map((r) =>
            r.id === editingId
              ? {
                  ...r,
                  name: name.trim(),
                  target,
                  customUrl: customUrl.trim(),
                  style,
                  moduleShape,
                  frameShape,
                  centerUseColor,
                  centerImageUrl: centerImageUrl.trim(),
                }
              : r,
          ),
        );
        resetCreateForm();
        setMessage("QR code updated.");
        router.refresh();
        return;
      }

      const res = await createQrRedirectAction({
        name,
        target,
        customUrl,
        style,
        moduleShape,
        frameShape,
        centerUseColor,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const createdAt = new Date().toISOString();
      setRows((prev) => [
        {
          id: res.id,
          name: name.trim(),
          publicCode: res.publicCode,
          target,
          customUrl: customUrl.trim(),
          visitCount: 0,
          style,
          moduleShape,
          frameShape,
          centerUseColor,
          centerImageUrl: "",
          createdAt,
        },
        ...prev,
      ]);
      resetCreateForm();
      setMessage(`Saved “${name.trim()}” as ${res.publicCode}.`);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!window.confirm("Delete this QR code? The short URL will stop working.")) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await deleteQrRedirectAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) resetCreateForm();
      setMessage("QR code deleted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-ink/15 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-6">
        <h2 className="text-lg font-bold text-palm dark:text-zinc-100">Default QR center image</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          Used in the middle of every generated QR PNG when a code does not override it. Falls back to the company logo
          from Global settings if empty.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={defaultFileRef}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
            className="max-w-full text-sm"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const fd = new FormData();
                fd.append("file", f);
                const res = await uploadQrDefaultCenterImageAction(fd);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setDefaultCenter(res.url);
                setMessage("Default center image saved.");
                router.refresh();
              });
            }}
          />
          {defaultCenter ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await clearQrDefaultCenterImageAction();
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setDefaultCenter("");
                  setMessage("Default center image removed.");
                  router.refresh();
                });
              }}
              className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Remove default
            </button>
          ) : null}
        </div>
        {defaultCenter ? (
          <p className="mt-2 font-mono text-xs text-ink/70 dark:text-zinc-400">{defaultCenter}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-ink/15 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:p-6">
        <h2 className="text-lg font-bold text-palm dark:text-zinc-100">{editingId ? "Edit QR code" : "Generate a QR code"}</h2>
        <p className="mt-1 text-sm text-ink/70 dark:text-zinc-400">
          {editingId ? (
            <>
              Public URL stays the same (<span className="font-mono">{rows.find((r) => r.id === editingId)?.publicCode}</span>
              ) — change where it sends people or how the PNG looks.
            </>
          ) : (
            <>
              The public path is assigned automatically (<span className="font-mono">QR1</span>, <span className="font-mono">QR2</span>, …).
              Optional URL or path below overrides the dropdown when filled.
            </>
          )}
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="e.g. Test QR"
              maxLength={120}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Redirect page</span>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as QrRedirectTargetType)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {TARGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Palette (modules)</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as QrStyleType)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Module shape</span>
            <select
              value={moduleShape}
              onChange={(e) => setModuleShape(e.target.value as QrModuleShapeType)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Frame</span>
            <select
              value={frameShape}
              onChange={(e) => setFrameShape(e.target.value as QrFrameShapeType)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {FRAME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={centerUseColor}
              onChange={(e) => setCenterUseColor(e.target.checked)}
              className="h-4 w-4 rounded border-ink/30 accent-palm"
            />
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">
              Use full color for center image (otherwise grayscale)
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-ink dark:text-zinc-200">Manual URL or path (optional)</span>
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="mt-1 w-full rounded border border-ink/20 bg-white px-3 py-2 font-mono text-sm text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="https://… or /your-path"
              maxLength={2000}
            />
          </label>

          {editingId ? (
            <div className="space-y-3 sm:col-span-2">
              <p className="text-sm font-semibold text-ink dark:text-zinc-200">This QR only — center image override</p>
              <p className="text-xs text-ink/65 dark:text-zinc-500">
                Optional: upload replaces the default center for this code only. Or paste a public <span className="font-mono">/uploads/…</span> or https URL.
              </p>
              <input
                value={centerImageUrl}
                onChange={(e) => setCenterImageUrl(e.target.value)}
                className="w-full rounded border border-ink/20 bg-white px-3 py-2 font-mono text-xs text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                placeholder="/uploads/… or https://…"
                maxLength={500}
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={overrideFileRef}
                  type="file"
                  accept="image/png,image/webp,image/jpeg,image/gif,image/avif"
                  className="max-w-full text-sm"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f || !editingId) return;
                    setError(null);
                    startTransition(async () => {
                      const fd = new FormData();
                      fd.append("file", f);
                      const res = await uploadQrRedirectOverrideCenterAction(editingId, fd);
                      if (!res.ok) {
                        setError(res.error);
                        return;
                      }
                      setCenterImageUrl(res.url);
                      setRows((prev) =>
                        prev.map((r) => (r.id === editingId ? { ...r, centerImageUrl: res.url } : r)),
                      );
                      setMessage("Override center image saved for this QR.");
                      router.refresh();
                    });
                  }}
                />
                {centerImageUrl.trim() ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!editingId) return;
                      startTransition(async () => {
                        const res = await clearQrRedirectOverrideCenterAction(editingId);
                        if (!res.ok) {
                          setError(res.error);
                          return;
                        }
                        setCenterImageUrl("");
                        setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, centerImageUrl: "" } : r)));
                        setMessage("Override center cleared.");
                        router.refresh();
                      });
                    }}
                    className="rounded border border-ink/25 px-2 py-1 text-xs font-semibold text-ink hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Clear override
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
            {message ? <p className="text-sm font-medium text-lagoon-dark dark:text-emerald-400">{message}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-palm px-4 py-2 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50"
              >
                {pending ? "Saving…" : editingId ? "Save changes" : "Save QR code"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    resetCreateForm();
                    setMessage(null);
                    setError(null);
                  }}
                  className="rounded border border-ink/25 px-4 py-2 text-sm font-semibold text-ink hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold text-palm dark:text-zinc-100">Your QR codes</h2>
        {sortedRows.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70 dark:text-zinc-400">None yet. Create one above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-ink/15 dark:border-zinc-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-100 text-xs font-bold uppercase tracking-wide text-ink/80 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">QR URL</th>
                  <th className="px-3 py-2">Redirect</th>
                  <th className="px-3 py-2">Look</th>
                  <th className="px-3 py-2">Visits</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-zinc-700">
                {sortedRows.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-zinc-950">
                    <td className="px-3 py-2 font-medium text-ink dark:text-zinc-100">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink/90 dark:text-zinc-300">
                      {displayHostPath(siteOrigin, row.publicCode)}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-ink/85 dark:text-zinc-300" title={redirectSummary(row)}>
                      {redirectSummary(row)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/75 dark:text-zinc-400">{shapeSummary(row)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{formatVisits(row.visitCount)}</td>
                    <td className="px-3 py-2 text-ink/80 dark:text-zinc-400">
                      {new Date(row.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => startEdit(row)}
                          className="rounded border border-ink/25 px-2 py-1 text-xs font-semibold text-ink hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                        <a
                          href={`/api/settings/qr-codes/${row.id}/png`}
                          className="inline-block rounded border border-ink/25 px-2 py-1 text-xs font-semibold text-lagoon-dark underline-offset-2 hover:underline dark:border-zinc-600 dark:text-emerald-400"
                        >
                          PNG
                        </a>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onDelete(row.id)}
                          className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
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
    </div>
  );
}
