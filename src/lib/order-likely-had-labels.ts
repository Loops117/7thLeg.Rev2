/** Order included custom labels at checkout but has no archived label lines. */
export function orderLikelyMissingLabelArchive(order: {
  labelLineCount: number;
  labelMerchandiseCentsSnap: number;
}): boolean {
  if (order.labelLineCount > 0) return false;
  return order.labelMerchandiseCentsSnap > 0;
}
