import { auth as readAuthSession } from "@/auth";
import { buildQrCodePng } from "@/lib/qr-image";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { getSiteConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

function absoluteFromOrigin(origin: string, pathOrUrl: string): string {
  const p = pathOrUrl.trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const originClean = origin.replace(/\/+$/, "");
  return p.startsWith("/") ? `${originClean}${p}` : `${originClean}/${p}`;
}

function pickCenterImagePath(
  row: { centerImageUrl: string },
  site: { qrDefaultCenterImageUrl: string; companyLogoUrl: string },
): string {
  const o = row.centerImageUrl?.trim();
  if (o) return o;
  const d = site.qrDefaultCenterImageUrl?.trim();
  if (d) return d;
  return site.companyLogoUrl?.trim() || "";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return new NextResponse("Not found", { status: 404 });
  }

  let row;
  try {
    row = await prisma.qrRedirect.findUnique({
      where: { id },
      select: {
        id: true,
        publicCode: true,
        style: true,
        moduleShape: true,
        frameShape: true,
        centerUseColor: true,
        centerImageUrl: true,
      },
    });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }

  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const origin = getPublicAppOrigin();
  const scanUrl = `${origin.replace(/\/+$/, "")}/${row.publicCode}`;

  const site = await getSiteConfig();
  const centerPath = pickCenterImagePath(row, site);

  let logoBuffer: Buffer | null = null;
  if (centerPath) {
    try {
      const logoUrl = absoluteFromOrigin(origin, centerPath);
      if (logoUrl) {
        const res = await fetch(logoUrl);
        if (res.ok) {
          logoBuffer = Buffer.from(await res.arrayBuffer());
        }
      }
    } catch {
      logoBuffer = null;
    }
  }

  let png: Buffer;
  try {
    png = await buildQrCodePng(
      scanUrl,
      row.style,
      row.moduleShape,
      row.frameShape,
      logoBuffer,
      row.centerUseColor,
    );
  } catch {
    return new NextResponse("Could not render QR", { status: 500 });
  }

  const safeName = `qr-${row.publicCode}.png`;
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
