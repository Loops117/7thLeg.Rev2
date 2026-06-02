import { auth as readAuthSession } from "@/auth";
import {
  orderLabelPreviewEntriesForLine,
  type OrderLabelLineRecord,
} from "@/lib/order-label-entries";
import { orderLabelPrintFilename, renderOrderLabelEntryToPng } from "@/lib/order-label-print-render";
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
  context: { params: Promise<{ orderId: string; lineId: string; entryIndex: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { orderId, lineId, entryIndex: entryIndexRaw } = await context.params;
  const entryIndex = Math.floor(Number(entryIndexRaw));
  if (!orderId?.trim() || !lineId?.trim() || !Number.isFinite(entryIndex) || entryIndex < 0) {
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

  const entries = orderLabelPreviewEntriesForLine(record);
  const entry = entries?.[entryIndex];
  if (!entry) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const png = await renderOrderLabelEntryToPng(entry.template, entry.doc, getPublicAppOrigin());
    const filename = orderLabelPrintFilename(entry.displayName, entryIndex);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("order label print render failed", e);
    return new NextResponse("Could not render label", { status: 500 });
  }
}
