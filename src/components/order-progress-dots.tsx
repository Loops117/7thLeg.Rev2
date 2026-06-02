import type { OrderStatus } from "@/generated/prisma/client";

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

export function OrderProgressDots({ status, className = "" }: { status: OrderStatus; className?: string }) {
  if (status === "CANCELLED") return null;

  const steps = 5;
  const lv = fulfillmentLevel(status);
  const barPct = Math.min(100, (lv / steps) * 100);

  return (
    <div className={`w-[76px] max-w-full ${className}`.trim()}>
      <div className="relative">
        <div className="absolute top-[3px] right-0 left-0 h-[2px] rounded-full bg-palm/20 dark:bg-zinc-700" aria-hidden />
        <div
          className="absolute top-[3px] left-0 h-[2px] rounded-full bg-palm dark:bg-emerald-300"
          style={{ width: `${barPct}%` }}
          aria-hidden
        />
        <div className="relative flex justify-between">
          {Array.from({ length: steps }).map((_, i) => {
            const done = i < lv;
            return (
              <span
                key={i}
                className={`h-[7px] w-[7px] rounded-full border transition-colors ${
                  done ? "border-palm bg-palm dark:border-emerald-300 dark:bg-emerald-300" : "border-palm/35 bg-white dark:border-zinc-500 dark:bg-zinc-900"
                }`}
                aria-hidden
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
