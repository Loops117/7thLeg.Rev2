export function OrderMissingLabelsNotice() {
  return (
    <div className="rounded border border-amber-600/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-50">
      <p className="font-bold">Custom labels not archived for this order</p>
      <p className="mt-1 text-amber-100/90 dark:text-amber-50/90">
        This checkout likely included label designs, but they were not saved on the order (for example, the order was
        completed before label archiving was enabled, or checkout ran on an older server build). The cart was cleared
        after payment, so designs cannot be recovered automatically. Place a new order to verify label archiving, or
        re-create the designs from the customer&apos;s saved library if needed.
      </p>
    </div>
  );
}
