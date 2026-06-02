"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSquarePaymentAction, prepareSquareCheckoutAction } from "@/app/actions/checkout-square";
import { formatPriceUsd } from "@/lib/product-slug";

declare global {
  interface Window {
    Square?: {
      payments(
        applicationId: string,
        locationId: string,
      ): SquarePaymentsInstance | Promise<SquarePaymentsInstance>;
    };
  }
}

type SquarePaymentsInstance = {
  card(): Promise<SquareCardInstance>;
};

type SquareCardInstance = {
  attach(selector: string): Promise<void>;
  tokenize(): Promise<{ status: string; token?: string; errors?: unknown[] }>;
  destroy?(): Promise<void>;
};

function squareScriptSrc(sandbox: boolean): string {
  return sandbox
    ? "https://sandbox.web.squarecdn.com/v1/square.js"
    : "https://web.squarecdn.com/v1/square.js";
}

function loadSquareWebSdk(sandbox: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = `square-web-payments-sdk-${sandbox ? "sandbox" : "live"}`;
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = squareScriptSrc(sandbox);
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Square payment SDK."));
    document.body.appendChild(s);
  });
}

type Prep = {
  orderId: string;
  applicationId: string;
  locationId: string;
  sandbox: boolean;
  totalCents: number;
};

export function CartSquarePayment({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [prep, setPrep] = useState<Prep | null>(null);
  const [cardSdkError, setCardSdkError] = useState("");
  const [cardReady, setCardReady] = useState(false);
  const cardRef = useRef<SquareCardInstance | null>(null);

  useEffect(() => {
    setCardReady(false);
    if (!prep) {
      cardRef.current = null;
      return;
    }

    const snap = prep;
    let cancelled = false;

    async function attach() {
      setCardSdkError("");
      cardRef.current = null;
      try {
        await loadSquareWebSdk(snap.sandbox);
      } catch (e) {
        if (!cancelled) setCardSdkError(e instanceof Error ? e.message : "Could not load Square.");
        return;
      }

      if (cancelled) return;

      try {
        const sq = window.Square;
        if (!sq?.payments) {
          setCardSdkError("Square is unavailable in this browser.");
          return;
        }

        const rawPayments = sq.payments(snap.applicationId, snap.locationId);
        const payments =
          typeof (rawPayments as Promise<SquarePaymentsInstance>).then === "function"
            ? await (rawPayments as Promise<SquarePaymentsInstance>)
            : (rawPayments as SquarePaymentsInstance);

        const card = await payments.card();
        await card.attach("#square-card-mount");
        if (cancelled) {
          await card.destroy?.().catch(() => {});
          return;
        }
        cardRef.current = card;
        if (!cancelled) setCardReady(true);
      } catch (e) {
        if (!cancelled) setCardSdkError(e instanceof Error ? e.message : "Could not show the card form.");
      }
    }

    const t = window.setTimeout(() => void attach(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setCardReady(false);
      void cardRef.current?.destroy?.().catch(() => {});
      cardRef.current = null;
    };
  }, [prep]);

  const prepare = useCallback(() => {
    setError("");
    startTransition(async () => {
      const r = await prepareSquareCheckoutAction();
      if (!r.ok) {
        setError(r.error);
        setPrep(null);
        return;
      }
      setPrep({
        orderId: r.orderId,
        applicationId: r.applicationId,
        locationId: r.locationId,
        sandbox: r.sandbox,
        totalCents: r.totalCents,
      });
    });
  }, []);

  async function submitPayment() {
    const card = cardRef.current;
    if (!prep || !card) {
      setError("Tap Checkout Now and wait for the card form first.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const tokResult = await card.tokenize();
      if (tokResult.status !== "OK" || !tokResult.token) {
        const errs = tokResult.errors as Array<{ detail?: string } | undefined>;
        const msg = errs?.[0]?.detail || "Could not charge this card.";
        setError(msg);
        return;
      }
      const res = await completeSquarePaymentAction(prep.orderId, tokResult.token);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.redirectUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  const btnDisabled = disabled || pending || paying;

  return (
    <div className="mt-6 rounded border border-palm/25 bg-white/70 p-4 text-left shadow-sm">
      <p className="text-sm font-bold text-ink">Checking out with Square!</p>

      {!prep ? (
        <button
          type="button"
          disabled={btnDisabled}
          className="mt-4 inline-flex rounded border-2 border-ink bg-ink px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-black disabled:pointer-events-none disabled:opacity-50"
          onClick={prepare}
        >
          {pending ? "Starting…" : "Checkout Now"}
        </button>
      ) : (
        <>
          <p className="mt-4 text-sm text-ink">
            Order total: <strong>{formatPriceUsd(prep.totalCents)}</strong>
          </p>
          <div id="square-card-mount" className="mt-4 min-h-[90px]" />
          {cardSdkError ? (
            <p className="mt-2 text-sm font-medium text-coral">{cardSdkError}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={btnDisabled || !!cardSdkError || !cardReady}
              className="inline-flex rounded border-2 border-ink bg-ink px-5 py-2.5 text-sm font-black uppercase tracking-wide text-white hover:bg-black disabled:pointer-events-none disabled:opacity-50"
              onClick={() => void submitPayment()}
            >
              {paying ? "Processing…" : "Pay Now"}
            </button>
            <button
              type="button"
              disabled={paying}
              className="text-sm font-bold text-ink underline"
              onClick={() => setPrep(null)}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}

      <p className="mt-3 text-xs text-ink/55">
        Card data is handled by Square. We never store your card number.
      </p>
    </div>
  );
}
