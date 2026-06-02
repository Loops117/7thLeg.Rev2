import { getLabelFulfillmentSettingsForAdmin } from "@/lib/site-config";
import type { LabelFulfillmentPrintSettings } from "@/lib/order-label-print-plan";

export type LabelFulfillmentRuntimeSettings = LabelFulfillmentPrintSettings & {
  showOnOrders: boolean;
  exportRaster: boolean;
};

export async function getLabelFulfillmentRuntimeSettings(): Promise<LabelFulfillmentRuntimeSettings> {
  const row = await getLabelFulfillmentSettingsForAdmin();
  return {
    sheetFormat: row.sheetFormat,
    sheetMarginMm: row.sheetMarginMm,
    labelGapMm: row.labelGapMm,
    printDpi: row.printDpi,
    printTransparentBackground: row.printTransparentBackground,
    showOnOrders: row.showOnOrders,
    exportRaster: row.exportRaster,
  };
}
