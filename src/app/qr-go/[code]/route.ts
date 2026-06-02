import { NextResponse } from "next/server";
import type { QrRedirectTarget } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { resolveQrRedirectDestinationUrl } from "@/lib/qr-redirect-url";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code: raw } = await context.params;
  const code = decodeURIComponent(raw || "").trim().toUpperCase();
  if (!/^QR\d+$/.test(code)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  let row: { target: QrRedirectTarget; customUrl: string } | null;
  try {
    row = await prisma.qrRedirect.findUnique({
      where: { publicCode: code },
      select: { target: true, customUrl: true },
    });
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  if (!row) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  try {
    await prisma.qrRedirect.update({
      where: { publicCode: code },
      data: { visitCount: { increment: 1 } },
    });
  } catch {
    // still redirect
  }

  const origin = getPublicAppOrigin();
  const dest = resolveQrRedirectDestinationUrl(row.target, row.customUrl, origin);
  return NextResponse.redirect(dest, 302);
}
