"use client";

import { adminDetailsPaneClass } from "@/lib/admin-surface-classes";
import { adminTableRowClass } from "@/lib/admin-table-classes";
import { btnImportantMd, btnSecondaryMd } from "@/lib/btn-theme-classes";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { EventKind, EventSaleDiscountMode } from "@/generated/prisma/client";
import { createProductType } from "@/app/actions/product-types-admin";
import {
  listEventGiveawayWinners,
  runEventGiveawayDraw,
  sendUnsentGiveawayEmails,
  type GiveawayWinnerRow,
} from "@/app/actions/event-giveaway-admin";
import {
  deleteEvent,
  exportEventEntriesCsv,
  listEventEntriesForAdmin,
  saveEvent,
  type EventEditPayload,
  type EventEntryRow,
  type EventListRow,
} from "@/app/actions/events-admin";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ProductTypeFormFields } from "@/components/settings/product-type-form-fields";
import type { ProductFooterOption } from "@/lib/products-admin-types";

function emptyForm(): EventEditPayload {
  return {
    id: "",
    kind: "TIMED",
    name: "",
    details: "",
    startAt: "",
    endAt: "",
    signupButtonLabel: "Sign up",
    couponCode: "",
    couponPickerMeansIncluded: false,
    pointsPerDollarOverride: null,
    saleDiscountMode: "NONE",
    saleDiscountPercent: null,
    saleDiscountCents: null,
    typeIds: [],
    productIds: [],
    couponPickProductIds: [],
    includesLabelMaker: false,
    includesFreeShipping: false,
    giveawayPrimaryCount: 1,
    giveawayBackupCount: 0,
    giveawaySendEmailOnDraw: false,
    giveawayEmailSubject: "Congratulations — you won!",
    giveawayEmailBody: "",
  };
}

const EVENTS_PATH = "/settings/events";

export function EventsAdminPanel({
  initialEvents,
  types: initialTypes,
  products,
  footers,
  editPayload,
  editIdFromUrl,
  editNotFound,
}: {
  initialEvents: EventListRow[];
  types: { id: string; name: string }[];
  products: { id: string; name: string; slug: string }[];
  footers: ProductFooterOption[];
  editPayload: EventEditPayload | null;
  editIdFromUrl: string | null;
  editNotFound?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialEvents);
  const [types, setTypes] = useState(initialTypes);
  const [paneEditorOpen, setPaneEditorOpen] = useState(() => Boolean(editIdFromUrl));
  const [form, setForm] = useState<EventEditPayload>(() =>
    editIdFromUrl && editPayload?.id === editIdFromUrl ? editPayload : emptyForm(),
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entriesByEvent, setEntriesByEvent] = useState<Record<string, EventEntryRow[]>>({});
  const [winnersByEvent, setWinnersByEvent] = useState<Record<string, GiveawayWinnerRow[]>>({});

  const [productSearch, setProductSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drawMsg, setDrawMsg] = useState<string | null>(null);

  const [newTypeOpen, setNewTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeSlug, setNewTypeSlug] = useState("");
  const [newTypeFooterIds, setNewTypeFooterIds] = useState<string[]>([]);
  const [newTypeStorefrontVisible, setNewTypeStorefrontVisible] = useState(true);
  const [newTypeErr, setNewTypeErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    setTypes(initialTypes);
  }, [initialTypes]);

  useEffect(() => {
    if (editIdFromUrl && editPayload && editPayload.id === editIdFromUrl) {
      setForm(editPayload);
      setPaneEditorOpen(true);
      return;
    }
    if (editIdFromUrl && editNotFound) {
      setForm(emptyForm());
      return;
    }
    if (!editIdFromUrl) {
      setForm(emptyForm());
    }
  }, [editPayload, editIdFromUrl, editNotFound]);

  const loadSignupEntries = useCallback((eventId: string, kind: EventKind) => {
    if (kind !== "SIGNUP") return;
    startTransition(async () => {
      const list = await listEventEntriesForAdmin(eventId);
      setEntriesByEvent((m) => ({ ...m, [eventId]: list }));
    });
  }, []);

  const loadGiveawayWinners = useCallback((eventId: string) => {
    startTransition(async () => {
      const w = await listEventGiveawayWinners(eventId);
      setWinnersByEvent((m) => ({ ...m, [eventId]: w }));
    });
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  function toggleType(id: string) {
    setForm((f) => ({
      ...f,
      typeIds: f.typeIds.includes(id) ? f.typeIds.filter((x) => x !== id) : [...f.typeIds, id],
    }));
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter((x) => x !== id) : [...f.productIds, id],
    }));
  }

  function toggleCouponPick(id: string) {
    setForm((f) => ({
      ...f,
      couponPickProductIds: f.couponPickProductIds.includes(id)
        ? f.couponPickProductIds.filter((x) => x !== id)
        : [...f.couponPickProductIds, id],
    }));
  }

  function toggleNewTypeFooter(id: string) {
    setNewTypeFooterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleCancel() {
    setForm(emptyForm());
    setPaneEditorOpen(false);
    setMsg(null);
    setErr(null);
    router.replace(EVENTS_PATH);
  }

  function handleClear() {
    setForm(emptyForm());
    setMsg(null);
    setErr(null);
    if (editIdFromUrl) router.replace(EVENTS_PATH);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const result = await saveEvent({
        id: form.id.trim() || undefined,
        kind: form.kind,
        name: form.name,
        details: form.details,
        startAt: form.startAt,
        endAt: form.endAt,
        typeIds: form.typeIds,
        productIds: form.productIds,
        signupButtonLabel: form.signupButtonLabel,
        pointsPerDollarOverride: form.pointsPerDollarOverride,
        saleDiscountMode: form.saleDiscountMode,
        saleDiscountPercent: form.saleDiscountPercent,
        saleDiscountCents: form.saleDiscountCents,
        giveawayPrimaryCount: form.giveawayPrimaryCount,
        giveawayBackupCount: form.giveawayBackupCount,
        giveawaySendEmailOnDraw: form.giveawaySendEmailOnDraw,
        giveawayEmailSubject: form.giveawayEmailSubject,
        giveawayEmailBody: form.giveawayEmailBody,
        couponCode: form.couponCode,
        couponPickerMeansIncluded: form.couponPickerMeansIncluded,
        couponPickProductIds: form.couponPickProductIds,
        includesLabelMaker: form.includesLabelMaker,
        includesFreeShipping: form.includesFreeShipping,
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setMsg(form.id ? "Saved." : "Created.");
      setForm(emptyForm());
      setPaneEditorOpen(false);
      router.replace(EVENTS_PATH);
      router.refresh();
    });
  }

  function createInlineType() {
    setNewTypeErr(null);
    startTransition(async () => {
      try {
        const id = await createProductType({
          name: newTypeName,
          slug: newTypeSlug.trim() || undefined,
          footerIds: newTypeFooterIds,
          storefrontVisible: newTypeStorefrontVisible,
        });
        setTypes((prev) => [...prev, { id, name: newTypeName.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((f) => ({ ...f, typeIds: [...f.typeIds, id] }));
        setNewTypeName("");
        setNewTypeSlug("");
        setNewTypeFooterIds([]);
        setNewTypeStorefrontVisible(true);
        setNewTypeOpen(false);
        router.refresh();
      } catch (ex) {
        setNewTypeErr(ex instanceof Error ? ex.message : "Could not create type.");
      }
    });
  }

  function removeEvent(id: string, label: string) {
    if (!window.confirm(`Delete event “${label}”? Panes referencing it will show an error until updated.`)) return;
    startTransition(async () => {
      await deleteEvent(id);
      setExpandedId((x) => (x === id ? null : x));
      router.refresh();
    });
  }

  function openEdit(id: string) {
    router.push(`${EVENTS_PATH}?edit=${encodeURIComponent(id)}`);
  }

  async function downloadEntriesCsv(eventId: string, filenameBase: string) {
    const r = await exportEventEntriesCsv(eventId);
    if (!r.ok) return;
    const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "entries"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleCatalogRow(r: EventListRow) {
    setDrawMsg(null);
    if (expandedId === r.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(r.id);
    loadSignupEntries(r.id, r.kind);
    if (r.kind === "SIGNUP") {
      loadGiveawayWinners(r.id);
    }
  }

  return (
    <div className="space-y-6">
      {editNotFound ? (
        <p className="rounded border-2 border-coral/40 bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          No event matches that link.
        </p>
      ) : null}

      <details
        open={paneEditorOpen}
        onToggle={(e) => {
          if (e.currentTarget !== e.target) return;
          setPaneEditorOpen((e.currentTarget as HTMLDetailsElement).open);
        }}
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm sm:px-6">
          Add or edit event
          <span className="mt-1 block text-xs font-normal text-ink/65">
            Choose timed sale, checkout coupon, or a sign-up giveaway. Save clears this panel.
          </span>
        </summary>
        <div className="space-y-4 p-4 sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <fieldset className="rounded border border-palm/25 p-3">
              <legend className="text-sm font-bold text-palm">Event type</legend>
              <div className="flex flex-wrap gap-4 text-sm font-bold text-ink">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="eventKind"
                    checked={form.kind === "TIMED"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        kind: "TIMED" as EventKind,
                      }))
                    }
                  />
                  Timed sale
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="eventKind"
                    checked={form.kind === "COUPON"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        kind: "COUPON" as EventKind,
                      }))
                    }
                  />
                  Checkout coupon
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="eventKind"
                    checked={form.kind === "SIGNUP"}
                    onChange={() =>
                      setForm((f) => ({
                        ...f,
                        kind: "SIGNUP" as EventKind,
                      }))
                    }
                  />
                  Sign-up / giveaway
                </label>
              </div>
              <p className="mt-2 text-xs text-ink/60">
                Timed events apply storefront sale prices during the window. Coupons are typed at checkout; both use the
                product types / products union below as the eligible catalog (coupons support an optional product picker).
                Optionally include Label Maker so custom labels in the cart receive the same discount. Giveaways collect one
                email sign-up per address.
              </p>
            </fieldset>

            <label className="block text-sm font-bold text-ink">
              Event name <span className="text-coral">*</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>

            {form.kind === "SIGNUP" ? (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-ink">
                  Sign-up button label
                  <input
                    value={form.signupButtonLabel}
                    onChange={(e) => setForm((f) => ({ ...f, signupButtonLabel: e.target.value }))}
                    className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                    placeholder="e.g. Enter giveaway"
                  />
                </label>
                <fieldset className="rounded border border-coral/35 bg-coral/5 p-3">
                  <legend className="text-sm font-bold text-coral">Random draw (admin)</legend>
                  <p className="mb-3 text-xs text-ink/65">
                    After sign-ups are collected, run a draw from the Events list (expand the row). Configure how many
                    primary and backup email addresses to pick, and optional email on draw (configure SMTP in Settings →
                    Email).
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-ink">
                      Primary winners
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={form.giveawayPrimaryCount}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            giveawayPrimaryCount: Math.min(500, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                          }))
                        }
                        className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-bold text-ink">
                      Backup winners
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={form.giveawayBackupCount}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            giveawayBackupCount: Math.min(500, Math.max(0, Math.floor(Number(e.target.value) || 0))),
                          }))
                        }
                        className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={form.giveawaySendEmailOnDraw}
                      onChange={(e) => setForm((f) => ({ ...f, giveawaySendEmailOnDraw: e.target.checked }))}
                    />
                    Send email to each selected address immediately after a draw
                  </label>
                  <label className="mt-3 block text-sm font-bold text-ink">
                    Email subject
                    <input
                      value={form.giveawayEmailSubject}
                      onChange={(e) => setForm((f) => ({ ...f, giveawayEmailSubject: e.target.value }))}
                      className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="mt-2 block text-sm font-bold text-ink">
                    Email body
                    <textarea
                      value={form.giveawayEmailBody}
                      onChange={(e) => setForm((f) => ({ ...f, giveawayEmailBody: e.target.value }))}
                      className="mt-1 min-h-[7rem] w-full border-2 border-palm-mid px-2 py-2 font-mono text-xs"
                      placeholder="Placeholders: {{email}}, {{eventName}}, {{eventUrl}}, {{role}} (Primary winner / Backup winner). If empty, a default message is used."
                    />
                  </label>
                </fieldset>
              </div>
            ) : null}

            <RichTextEditor
              label="Details"
              value={form.details}
              onChange={(html) => setForm((f) => ({ ...f, details: html }))}
              minHeightClassName="min-h-[9rem]"
              placeholder="Event description, rules, dates…"
            />

            <div className="flex flex-wrap gap-4">
              <label className="block text-sm font-bold text-ink">
                Start <span className="text-coral">*</span>
                <input
                  required
                  type="datetime-local"
                  value={form.startAt.length >= 16 ? form.startAt.slice(0, 16) : form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  className="mt-1 w-full min-w-[12rem] border-2 border-palm-mid px-2 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                End <span className="text-coral">*</span>
                <input
                  required
                  type="datetime-local"
                  value={form.endAt.length >= 16 ? form.endAt.slice(0, 16) : form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  className="mt-1 w-full min-w-[12rem] border-2 border-palm-mid px-2 py-2 text-sm"
                />
              </label>
            </div>

            {form.kind === "TIMED" ? (
              <fieldset className="rounded border border-palm/25 p-3">
                <legend className="text-sm font-bold text-palm">Loyalty (timed only)</legend>
                <p className="mb-3 text-xs text-ink/60">
                  Optionally override loyalty points-per-dollar earned on linked products during the window (see Loyalty in
                  global settings otherwise).
                </p>
                <label className="block text-sm font-bold text-ink">
                  Points per $1.00 for these items (optional)
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={form.pointsPerDollarOverride ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setForm((f) => ({
                        ...f,
                        pointsPerDollarOverride: v === "" ? null : Math.min(1000, Math.max(0, Math.floor(Number(v) || 0))),
                      }));
                    }}
                    placeholder="Leave blank for site default (Loyalty program)"
                    className="mt-1 w-40 border-2 border-palm-mid px-2 py-2 text-sm"
                  />
                </label>
              </fieldset>
            ) : null}

            {(form.kind === "TIMED" || form.kind === "COUPON") ? (
              <fieldset className="rounded border border-palm/25 p-3">
                <legend className="text-sm font-bold text-palm">
                  {form.kind === "COUPON" ? "Checkout promo" : "Sale pricing (timed storefront)"}
                </legend>
                {form.kind === "TIMED" ? (
                  <p className="mb-3 text-xs text-ink/60">
                    Linked products show this sale pricing on event pages and via <code>?event=</code> product links.
                    Lines added from those links persist the sale prices in cart and checkout while the timed window is active.
                  </p>
                ) : (
                  <p className="mb-3 text-xs text-ink/60">
                    Customers enter your code on the cart page within the dates above. Stacks on timed-sale pricing per line
                    when this coupon applies to those products (see picker below).
                  </p>
                )}
                {form.kind === "COUPON" ? (
                  <label className="block text-sm font-bold text-ink">
                    Promo code <span className="text-coral">*</span>
                    <input
                      required={form.kind === "COUPON"}
                      value={form.couponCode}
                      onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
                      placeholder="SPRING2026"
                      className="mt-1 w-full max-w-sm border-2 border-palm-mid px-2 py-2 font-mono text-sm uppercase"
                    />
                    <span className="mt-1 block text-xs font-normal text-ink/55">
                      Stored uppercase; shoppers can type case-insensitive.
                    </span>
                  </label>
                ) : null}
                {form.kind === "COUPON" ? (
                  <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.couponPickerMeansIncluded}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          couponPickerMeansIncluded: e.target.checked,
                        }))
                      }
                    />
                    <span>
                      Checked picker products receive the promo (only those),
                      <br />
                      <span className="text-xs font-normal text-ink/65">
                        When off (default): checked picker products do <strong>not</strong> receive the promo; every other eligible catalog product does.
                      </span>
                    </span>
                  </label>
                ) : null}
                <label className={`block text-sm font-bold text-ink ${form.kind === "COUPON" ? "mt-6" : "mt-1"}`}>
                  Discount
                  <select
                    value={form.saleDiscountMode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        saleDiscountMode: e.target.value as EventSaleDiscountMode,
                      }))
                    }
                    className="mt-1 block w-full max-w-xs border-2 border-palm-mid px-2 py-2 text-sm sm:w-auto"
                  >
                    <option value="NONE">No automatic discount</option>
                    <option value="PERCENT">Percent off (per unit)</option>
                    <option value="FIXED_CENTS">Fixed cents off each unit</option>
                  </select>
                </label>
                {form.saleDiscountMode === "PERCENT" ? (
                  <label className="mt-3 block text-sm font-bold text-ink">
                    Percent off (1–100)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={form.saleDiscountPercent ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        setForm((f) => ({
                          ...f,
                          saleDiscountPercent: v === "" ? null : Math.min(100, Math.max(1, Math.floor(Number(v) || 0))),
                        }));
                      }}
                      className="mt-1 w-32 border-2 border-palm-mid px-2 py-2 text-sm"
                    />
                  </label>
                ) : null}
                {form.saleDiscountMode === "FIXED_CENTS" ? (
                  <label className="mt-3 block text-sm font-bold text-ink">
                    Dollars off each unit (after timed sale pricing, if any)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.saleDiscountCents == null ? "" : (form.saleDiscountCents / 100).toFixed(2)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setForm((f) => ({
                          ...f,
                          saleDiscountCents: Number.isNaN(n) ? null : Math.max(0, Math.round(n * 100)),
                        }));
                      }}
                      className="mt-1 w-32 border-2 border-palm-mid px-2 py-2 text-sm"
                    />
                  </label>
                ) : null}
              </fieldset>
            ) : null}

            {form.kind === "TIMED" || form.kind === "COUPON" ? (
              <div className="space-y-3">
                {form.saleDiscountMode !== "NONE" ? (
                  <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/25 bg-surf/30 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={form.includesLabelMaker}
                      onChange={(e) => setForm((f) => ({ ...f, includesLabelMaker: e.target.checked }))}
                    />
                    <span>
                      <span className="font-bold text-ink">Include Label Maker</span>
                      <span className="mt-0.5 block text-xs font-normal text-ink/65">
                        When checked, custom label lines in the cart receive this event&apos;s discount (in addition to
                        products matched by types / products below).
                      </span>
                    </span>
                  </label>
                ) : null}
                <label className="flex cursor-pointer items-start gap-2 rounded border border-palm/25 bg-surf/30 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.includesFreeShipping}
                    onChange={(e) => setForm((f) => ({ ...f, includesFreeShipping: e.target.checked }))}
                  />
                  <span>
                    <span className="font-bold text-ink">Free shipping</span>
                    <span className="mt-0.5 block text-xs font-normal text-ink/65">
                      When checked, shipping is waived at checkout while this event is active (applied coupon, or any
                      active timed event with this option).
                    </span>
                  </span>
                </label>
              </div>
            ) : null}

            <div className="overflow-hidden rounded border border-palm/25">
              <fieldset className="border-0 p-3">
                <legend className="text-sm font-bold text-palm">Product types in this event</legend>
                <p className="mb-2 text-xs text-ink/60">All products with these types are included. Union with specific products below.</p>
                {types.length === 0 ? (
                  <p className="text-sm text-ink/60">No types yet.</p>
                ) : (
                  <div className="flex max-h-40 flex-col gap-2 overflow-y-auto text-sm">
                    {types.map((t) => (
                      <label key={t.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={form.typeIds.includes(t.id)} onChange={() => toggleType(t.id)} />
                        {t.name}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>

              <details
                open={newTypeOpen}
                onToggle={(e) => {
                  e.stopPropagation();
                  setNewTypeOpen((e.currentTarget as HTMLDetailsElement).open);
                }}
                onKeyDownCapture={(e) => {
                  if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
                }}
                className="border-0 border-t border-palm/25 bg-surf/20 [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="px-3 py-2 text-sm font-bold text-palm">Create new product type for this event</summary>
                <div className="space-y-3 border-t border-palm/15 p-3">
                  <ProductTypeFormFields
                    name={newTypeName}
                    setName={setNewTypeName}
                    slug={newTypeSlug}
                    setSlug={setNewTypeSlug}
                    parentId=""
                    setParentId={() => {}}
                    parentOptions={[]}
                    storefrontVisible={newTypeStorefrontVisible}
                    setStorefrontVisible={setNewTypeStorefrontVisible}
                    footerIds={newTypeFooterIds}
                    toggleFooter={toggleNewTypeFooter}
                    footers={footers}
                    nameRequired={false}
                  />
                  {newTypeErr ? <p className="text-sm text-coral">{newTypeErr}</p> : null}
                  <button
                    type="button"
                    disabled={pending || !newTypeName.trim()}
                    onClick={createInlineType}
                    className={btnSecondaryMd}
                  >
                    Create type &amp; attach to event
                  </button>
                </div>
              </details>
            </div>

            <label className="block text-sm font-bold text-ink">
              Filter products
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Name or slug…"
                className="mt-1 w-full border-2 border-palm-mid px-2 py-2 text-sm"
              />
            </label>
            <fieldset className="rounded border border-palm/25 p-3">
              <legend className="text-sm font-bold text-palm">Specific products (optional)</legend>
              <p className="mb-2 text-xs text-ink/60">Checked items are always included in addition to type matches.</p>
              <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
                {filteredProducts.length === 0 ? (
                  <p className="text-ink/60">No products match.</p>
                ) : (
                  filteredProducts.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.productIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                      <span>{p.name}</span>
                      <span className="font-mono text-xs text-ink/50">{p.slug}</span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>

            {form.kind === "COUPON" ? (
              <fieldset className="rounded border border-lagoon/30 bg-lagoon/5 p-3">
                <legend className="text-sm font-bold text-palm">Coupon product picker (optional)</legend>
                <p className="mb-2 text-xs text-ink/65">
                  Use the same filtered list. Meaning depends on the checkbox above: by default, checked products are excluded
                  from the promo; unchecked catalog products get the discount.
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto text-sm">
                  {filteredProducts.length === 0 ? (
                    <p className="text-ink/60">No products match.</p>
                  ) : (
                    filteredProducts.map((p) => (
                      <label key={`cp-${p.id}`} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.couponPickProductIds.includes(p.id)}
                          onChange={() => toggleCouponPick(p.id)}
                        />
                        <span>{p.name}</span>
                        <span className="font-mono text-xs text-ink/50">{p.slug}</span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-palm/15 pt-4">
              <button
                type="submit"
                disabled={pending}
                className="border-2 border-black bg-black px-4 py-2 text-sm font-bold text-white hover:bg-neutral-900 disabled:opacity-50"
              >
                {pending ? "Saving…" : form.id ? "Save event" : "Create event"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="border-2 border-palm-mid px-4 py-2 text-sm font-bold text-palm hover:bg-surf"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="border-2 border-palm-mid px-4 py-2 text-sm font-bold text-ink hover:bg-surf"
              >
                Cancel
              </button>
              {msg ? <span className="text-sm text-lagoon-dark">{msg}</span> : null}
              {err ? <span className="text-sm text-coral">{err}</span> : null}
            </div>
          </form>
        </div>
      </details>

      <details
        open
        className={adminDetailsPaneClass}
      >
        <summary className="border-b-2 border-palm/20 px-4 py-3 text-lg font-black text-palm sm:px-6">
          Event catalog ({rows.length})
        </summary>
        <div className="p-4 sm:p-6">
          {rows.length === 0 ? (
            <p className="text-sm text-ink/70">No events yet. Expand the editor above to add one.</p>
          ) : (
            <div className="overflow-x-auto rounded border-2 border-palm">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b-2 border-palm bg-surf/50 font-bold text-palm">
                  <tr>
                    <th className="px-3 py-2"> </th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Scope</th>
                    <th className="px-3 py-2">Entries</th>
                    <th className="px-3 py-2">Draw</th>
                    <th className="px-2 py-2"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Fragment key={r.id}>
                      <tr className={adminTableRowClass}>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="rounded border border-palm/40 px-2 py-1 text-xs font-bold text-palm hover:bg-surf"
                            aria-expanded={expandedId === r.id}
                            onClick={() => toggleCatalogRow(r)}
                          >
                            {expandedId === r.id ? "Collapse" : "View"}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.kind === "TIMED" ? "Timed sale" : r.kind === "COUPON" ? "Coupon" : "Sign-up"}
                          {r.kind === "COUPON" && r.couponCode.trim() ? (
                            <span className="mt-0.5 block font-mono text-[0.65rem] text-ink/60">
                              {r.couponCode.trim()}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-xs text-ink/80">{new Date(r.startAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs text-ink/80">{new Date(r.endAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.typeCount} types · {r.productCount} products
                        </td>
                        <td className="px-3 py-2 text-xs">{r.kind === "SIGNUP" ? r.entryCount : "—"}</td>
                        <td className="px-3 py-2 text-xs text-ink/80">
                          {r.kind === "SIGNUP" ? (r.giveawayWinnersCount > 0 ? r.giveawayWinnersCount : "—") : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-palm underline"
                              onClick={() => openEdit(r.id)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              className="text-xs font-bold text-coral underline disabled:opacity-40"
                              onClick={() => removeEvent(r.id, r.name)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === r.id ? (
                        <tr key={`${r.id}-detail`} className="border-b border-palm/15 bg-surf/30">
                          <td colSpan={9} className="px-4 py-4 text-sm text-ink/90">
                            <p className="font-bold text-palm">Public page</p>
                            <p className="mt-1 font-mono text-xs">
                              <a
                                href={`/event/${r.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-lagoon-dark underline"
                              >
                                /event/{r.id}
                              </a>
                            </p>
                            {r.kind === "TIMED" ? (
                              <ul className="mt-3 list-inside list-disc text-xs text-ink/80">
                                <li>
                                  Discount:{" "}
                                  {r.saleDiscountMode === "NONE"
                                    ? "None"
                                    : r.saleDiscountMode === "PERCENT"
                                      ? `${r.saleDiscountPercent ?? "?"}% off`
                                      : `$${((r.saleDiscountCents ?? 0) / 100).toFixed(2)} off each unit`}
                                </li>
                                <li>
                                  Points / $1 for these items:{" "}
                                  {r.pointsPerDollarOverride != null ? r.pointsPerDollarOverride : "Loyalty default"}
                                </li>
                              </ul>
                            ) : r.kind === "COUPON" ? (
                              <ul className="mt-3 list-inside list-disc text-xs text-ink/80">
                                <li>
                                  Code: <span className="font-mono">{r.couponCode.trim() || "(empty)"}</span>
                                </li>
                                <li>
                                  Discount:{" "}
                                  {r.saleDiscountMode === "NONE"
                                    ? "None"
                                    : r.saleDiscountMode === "PERCENT"
                                      ? `${r.saleDiscountPercent ?? "?"}% off each eligible unit`
                                      : `$${((r.saleDiscountCents ?? 0) / 100).toFixed(2)} off each eligible unit`}
                                </li>
                              </ul>
                            ) : (
                              <p className="mt-2 text-xs text-ink/80">
                                Button label: <strong>{r.signupButtonLabel}</strong>
                              </p>
                            )}
                            <div className="store-rich mt-4 max-w-3xl border-t border-palm/20 pt-4 [&_a]:text-lagoon-dark [&_a]:underline">
                              {r.details?.trim() ? (
                                // eslint-disable-next-line react/no-danger
                                <div dangerouslySetInnerHTML={{ __html: r.details }} />
                              ) : (
                                <p className="text-ink/55">No details HTML.</p>
                              )}
                            </div>
                            {r.kind === "SIGNUP" ? (
                              <div className="mt-4 border-t border-palm/20 pt-4">
                                <div className="flex flex-wrap items-center gap-3">
                                  <p className="text-sm font-bold text-palm">
                                    Sign-ups ({entriesByEvent[r.id]?.length ?? r.entryCount})
                                  </p>
                                  <button
                                    type="button"
                                    className="border-2 border-palm bg-white px-3 py-1.5 text-xs font-bold text-palm hover:bg-surf"
                                    onClick={() => downloadEntriesCsv(r.id, r.name)}
                                  >
                                    Export CSV
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-lagoon-dark underline"
                                    onClick={() => loadSignupEntries(r.id, "SIGNUP")}
                                  >
                                    Refresh list
                                  </button>
                                </div>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded border border-palm/20 bg-white/80 dark:border-zinc-600 dark:bg-zinc-900/50">
                                  <table className="w-full text-left text-xs">
                                    <thead className="sticky top-0 bg-surf/80 font-bold text-palm">
                                      <tr>
                                        <th className="px-2 py-1">Email</th>
                                        <th className="px-2 py-1">Signed up (UTC)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(entriesByEvent[r.id] ?? []).map((en, i) => (
                                        <tr key={`${en.email}-${i}`} className="border-t border-palm/10">
                                          <td className="px-2 py-1 font-mono">{en.email}</td>
                                          <td className="px-2 py-1 text-ink/75">{en.createdAt}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {!entriesByEvent[r.id]?.length ? (
                                    <p className="px-2 py-3 text-ink/55">No entries loaded yet or list is empty.</p>
                                  ) : null}
                                </div>
                                <div className="mt-6 border-t border-coral/25 pt-4">
                                  <p className="text-sm font-bold text-coral">Random draw</p>
                                  <p className="mt-1 text-xs text-ink/65">
                                    Picks a new random set of primary + backup entries (no duplicates). Replaces any
                                    previous draw. Requires enough sign-ups for the counts saved on this event (use Edit to
                                    change them).
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      className={`${btnImportantMd} disabled:opacity-50`}
                                      disabled={pending}
                                      onClick={() => {
                                        if (
                                          !window.confirm(
                                            "Run a new random draw? This replaces the current primary/backup list.",
                                          )
                                        ) {
                                          return;
                                        }
                                        setDrawMsg(null);
                                        startTransition(async () => {
                                          const res = await runEventGiveawayDraw(r.id);
                                          if (!res.ok) {
                                            setDrawMsg(res.error);
                                            return;
                                          }
                                          setDrawMsg(
                                            `Draw complete: ${res.primary} primary, ${res.backup} backup.` +
                                              (res.emailed > 0 ? ` Emailed ${res.emailed}.` : " No auto-email."),
                                          );
                                          loadGiveawayWinners(r.id);
                                          router.refresh();
                                        });
                                      }}
                                    >
                                      Run new random draw
                                    </button>
                                    <button
                                      type="button"
                                      className="border-2 border-palm bg-white px-3 py-1.5 text-xs font-bold text-palm hover:bg-surf"
                                      disabled={pending}
                                      onClick={() => {
                                        setDrawMsg(null);
                                        startTransition(async () => {
                                          const res = await sendUnsentGiveawayEmails(r.id);
                                          if (!res.ok) {
                                            setDrawMsg(res.error);
                                            return;
                                          }
                                          setDrawMsg(
                                            res.sent > 0
                                              ? `Sent ${res.sent} message(s)${res.failed ? ` (last error: ${res.failed})` : ""}.`
                                              : "No unsent messages (everyone is marked emailed, or no draw yet).",
                                          );
                                          loadGiveawayWinners(r.id);
                                          router.refresh();
                                        });
                                      }}
                                    >
                                      Email unsent winners
                                    </button>
                                    <button
                                      type="button"
                                      className="text-xs font-bold text-lagoon-dark underline"
                                      onClick={() => loadGiveawayWinners(r.id)}
                                    >
                                      Refresh winners
                                    </button>
                                  </div>
                                  {drawMsg ? <p className="mt-2 text-xs text-ink/80">{drawMsg}</p> : null}
                                  <div className="mt-3 overflow-x-auto rounded border border-coral/20 bg-white/90 dark:border-zinc-600 dark:bg-zinc-900/50">
                                    <table className="w-full min-w-[28rem] text-left text-xs">
                                      <thead className="bg-surf/80 font-bold text-coral">
                                        <tr>
                                          <th className="px-2 py-1">Email</th>
                                          <th className="px-2 py-1">Role</th>
                                          <th className="px-2 py-1">#</th>
                                          <th className="px-2 py-1">Emailed (UTC)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(winnersByEvent[r.id] ?? []).map((w) => (
                                          <tr key={w.id} className="border-t border-coral/10">
                                            <td className="px-2 py-1 font-mono">{w.email}</td>
                                            <td className="px-2 py-1">
                                              {w.role === "PRIMARY" ? "Primary" : "Backup"}
                                            </td>
                                            <td className="px-2 py-1">{w.position + 1}</td>
                                            <td className="px-2 py-1 text-ink/70">{w.emailSentAt ?? "—"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {!winnersByEvent[r.id]?.length ? (
                                      <p className="px-2 py-3 text-ink/50">No draw yet — or refresh.</p>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
