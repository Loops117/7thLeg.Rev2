import { formatCustomerFullName } from "@/lib/customer-display-name";
import { zipSync } from "fflate";
import {
  buildOrderPrintSheetFiles,
  type LabelFulfillmentPrintSettings,
} from "@/lib/order-label-print-plan";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { renderOrderLabelSheetToPng } from "@/lib/order-label-print-render";

export async function buildOrderLabelPrintSheetsZip(
  lines: OrderLabelLineRecord[],
  settings: LabelFulfillmentPrintSettings,
  origin: string,
): Promise<Buffer> {
  const files = buildOrderPrintSheetFiles(lines, settings);
  if (files.length === 0) {
    throw new Error("No print sheets for this order.");
  }

  const zipEntries: Record<string, Uint8Array> = {};
  for (const file of files) {
    const png = await renderOrderLabelSheetToPng(file.spec, settings, origin);
    zipEntries[file.filename] = new Uint8Array(png);
  }

  return Buffer.from(zipSync(zipEntries));
}

export function orderLabelPrintSheetsZipFilename(customerLabel: string, orderDate: Date): string {
  const name =
    customerLabel
      .replace(/[^\w\s.-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "customer";
  const date = orderDate.toISOString().slice(0, 10);
  return `${name}-${date}-print-sheets.zip`;
}

export function orderLabelPrintSheetsZipFilenameForOrder(
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  } | null,
  orderDate: Date,
): string {
  const customerLabel =
    (customer ? formatCustomerFullName(customer) : "") || customer?.email || "order";
  return orderLabelPrintSheetsZipFilename(customerLabel, orderDate);
}
