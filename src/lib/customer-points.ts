export type CustomerPointsLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  orderId: string | null;
  artSubmissionId: string | null;
  createdAt: string;
};

export function formatPointsLedgerWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function formatPointsDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
