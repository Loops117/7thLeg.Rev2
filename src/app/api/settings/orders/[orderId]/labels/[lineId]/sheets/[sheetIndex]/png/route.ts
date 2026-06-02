import { auth as readAuthSession } from "@/auth";
import { getLabelFulfillmentRuntimeSettings } from "@/lib/label-fulfillment-print-settings";
import { buildOrderLabelPrintSheetSpecs, orderLabelSheetFilename } from "@/lib/order-label-print-plan";
import { orderLabelPreviewEntriesForLine, type OrderLabelLineRecord } from "@/lib/order-label-entries";
import { renderOrderLabelSheetToPng } from "@/lib/order-label-print-render";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string; lineId: string; sheetIndex: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { orderId, lineId, sheetIndex: sheetIndexRaw } = await context.params;
  const sheetIndex = Math.floor(Number(sheetIndexRaw));
  if (!orderId?.trim() || !lineId?.trim() || !Number.isFinite(sheetIndex) || sheetIndex < 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const line = await prisma.orderLabelLine.findFirst({
    where: { id: lineId.trim(), orderId: orderId.trim() },
    include: { template: true },
  });
  if (!line) {
    return new NextResponse("Not found", { status: 404 });
  }

  const record: OrderLabelLineRecord = {
    id: line.id,
    displayName: line.displayName,
    quantity: line.quantity,
    unitCents: line.unitCents,
    lineTotalCents: line.lineTotalCents,
    documentJson: line.documentJson,
    templateId: line.templateId,
    dataRowLabel: line.dataRowLabel,
    widthMm: line.widthMm,
    heightMm: line.heightMm,
    labelsPerSheet: line.labelsPerSheet,
    sheetsCount: line.sheetsCount,
    sheetFormat: line.sheetFormat,
    template: line.template,
  };

  if (!orderLabelPreviewEntriesForLine(record)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fulfillment = await getLabelFulfillmentRuntimeSettings();
  if (!fulfillment.exportRaster) {
    return new NextResponse("Raster export is disabled in label fulfillment settings.", { status: 403 });
  }

  const specs = buildOrderLabelPrintSheetSpecs(record, fulfillment);
  const spec = specs.find((s) => s.sheetIndex === sheetIndex);
  if (!spec) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const png = await renderOrderLabelSheetToPng(spec, fulfillment, getPublicAppOrigin());
    const filename = orderLabelSheetFilename(
      line.displayName,
      sheetIndex,
      specs.length,
      spec.labelWidthMm,
      spec.labelHeightMm,
    );
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("order label sheet render failed", e);
    return new NextResponse("Could not render print sheet", { status: 500 });
  }
}
