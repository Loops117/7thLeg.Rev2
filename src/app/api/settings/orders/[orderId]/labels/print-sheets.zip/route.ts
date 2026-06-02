import { auth as readAuthSession } from "@/auth";
import { getLabelFulfillmentRuntimeSettings } from "@/lib/label-fulfillment-print-settings";
import type { OrderLabelLineRecord } from "@/lib/order-label-entries";
import { orderLabelPreviewEntriesForLine } from "@/lib/order-label-entries";
import {
  buildOrderLabelPrintSheetsZip,
  orderLabelPrintSheetsZipFilenameForOrder,
} from "@/lib/order-label-print-zip";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

export async function GET(_request: Request, context: { params: Promise<{ orderId: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: {
      createdAt: true,
      customer: {
        select: { email: true, firstName: true, lastName: true, displayName: true },
      },
    },
  });
  if (!order) {
    return new NextResponse("Not found", { status: 404 });
  }

  const labelRows = await prisma.orderLabelLine.findMany({
    where: { orderId: orderId.trim() },
    orderBy: { sortOrder: "asc" },
    include: { template: true },
  });

  const lines: OrderLabelLineRecord[] = labelRows
    .map((row) => ({
      id: row.id,
      displayName: row.displayName,
      quantity: row.quantity,
      unitCents: row.unitCents,
      lineTotalCents: row.lineTotalCents,
      documentJson: row.documentJson,
      templateId: row.templateId,
      dataRowLabel: row.dataRowLabel,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
      labelsPerSheet: row.labelsPerSheet,
      sheetsCount: row.sheetsCount,
      sheetFormat: row.sheetFormat,
      template: row.template,
    }))
    .filter((line) => orderLabelPreviewEntriesForLine(line));

  if (lines.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fulfillment = await getLabelFulfillmentRuntimeSettings();
  if (!fulfillment.exportRaster) {
    return new NextResponse("Raster export is disabled in label fulfillment settings.", { status: 403 });
  }

  try {
    const zip = await buildOrderLabelPrintSheetsZip(lines, fulfillment, getPublicAppOrigin());
    const filename = orderLabelPrintSheetsZipFilenameForOrder(order.customer, order.createdAt);
    const asciiFilename = filename.replace(/[^\x20-\x7E]/g, "_");
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("order label print sheets zip failed", e);
    return new NextResponse("Could not build print sheets", { status: 500 });
  }
}
