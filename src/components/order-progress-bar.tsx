import type { OrderStatus } from "@/generated/prisma/client";

const STEPS = ["Paid", "Accepted", "Fulfilled", "Shipped", "Complete"] as const;

function fulfillmentLevel(status: OrderStatus): number {
  switch (status) {
    case "PENDING":
      return 0;
    case "PAID":
      return 1;
    case "ACCEPTED":
      return 2;
    case "FULFILLED":
      return 3;
    case "SHIPPED":
      return 4;
    case "COMPLETE":
      return 5;
    default:
      return 0;
  }
}

/** Customer-facing fulfillment timeline (collapsed orders). Cancelled replaces the timeline. */
export function OrderProgressBar({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-lg border border-coral/55 bg-red-950/20 px-3 py-2 text-center">
        <p className="text-xs font-black uppercase tracking-wide text-coral">Cancelled</p>
        <p className="mt-1 text-[11px] text-ink/70">This order was cancelled.</p>
      </div>
    );
  }

  const lv = fulfillmentLevel(status);
  const barPct = STEPS.length > 0 ? Math.min(100, (lv / STEPS.length) * 100) : 0;

  return (
    <div className="mb-4 rounded-lg border border-palm/20 bg-surf/35 px-2 py-3 sm:px-3">
      <p className="mb-3 text-center text-[10px] font-black uppercase tracking-wider text-palm-mid">Order progress</p>
      {lv === 0 ? (
        <p className="mb-3 text-center text-xs text-ink/65">Awaiting payment…</p>
      ) : null}

      <div className="relative mb-6">
        <div className="absolute top-[7px] right-0 left-0 h-[3px] rounded-full bg-palm/15" aria-hidden />
        <div
          className="absolute top-[7px] left-0 h-[3px] rounded-full bg-gradient-to-r from-palm-mid to-palm transition-[width] duration-500"
          style={{ width: `${barPct}%` }}
          aria-hidden
        />
        <div className="relative flex justify-between">
          {STEPS.map((label, i) => {
            const done = i < lv;
            return (
              <div key={label} className="flex w-0 min-w-[3.25rem] flex-1 flex-col items-center px-0.5">
                <span
                  className={`relative z-[1] h-[17px] w-[17px] shrink-0 rounded-full border-[2px] shadow-sm transition-colors sm:h-[18px] sm:w-[18px] ${
                    done ? "border-palm bg-palm" : "border-palm/35 bg-white"
                  }`}
                  aria-hidden
                />
                <span
                  className={`mt-1.5 block max-w-[4.75rem] text-center text-[9px] font-bold uppercase leading-tight tracking-tight sm:max-w-[5.75rem] sm:text-[10px] ${
                    done ? "text-palm" : "text-ink/45"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
