import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { getSiteConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";
import { QrCodesAdminClient } from "@/components/settings/qr-codes-admin-client";
import type { QrFrameShape, QrModuleShape, QrRedirectTarget, QrStyle } from "@/generated/prisma/enums";

type QrListRow = {
  id: string;
  name: string;
  publicCode: string;
  target: QrRedirectTarget;
  customUrl: string;
  visitCount: number;
  style: QrStyle;
  moduleShape: QrModuleShape;
  frameShape: QrFrameShape;
  centerUseColor: boolean;
  centerImageUrl: string;
  createdAt: Date;
};

export default async function SettingsQrCodesPage() {
  const [rows, siteOrigin, site] = await Promise.all([
    prisma.qrRedirect
      .findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          publicCode: true,
          target: true,
          customUrl: true,
          visitCount: true,
          style: true,
          moduleShape: true,
          frameShape: true,
          centerUseColor: true,
          centerImageUrl: true,
          createdAt: true,
        },
      })
      .catch(() => [] as QrListRow[]),
    Promise.resolve(getPublicAppOrigin()),
    getSiteConfig(),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">QR Codes</h1>
      <p className="mt-4 text-ink/80">
        Short links like <span className="font-mono text-sm">/{rows[0]?.publicCode ?? "QR1"}</span> count visits and
        send people to a storefront page or a URL you choose. Download a PNG with your logo in the center for print.
      </p>
      <div className="mt-8">
        <QrCodesAdminClient
          initialRows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          siteOrigin={siteOrigin}
          defaultCenterImageUrl={site.qrDefaultCenterImageUrl}
        />
      </div>
    </div>
  );
}
