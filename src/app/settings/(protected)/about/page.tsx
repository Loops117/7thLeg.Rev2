import Link from "next/link";
import { PageKey } from "@/generated/prisma/enums";
import { StorefrontNavHeaderPanel } from "@/components/settings/storefront-nav-header-panel";
import { HomePanesEditor } from "@/components/settings/home-panes-editor";
import { storefrontPathForPageKey } from "@/lib/pane-pages";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { listKnownArtGroupNamesForAdmin } from "@/lib/customer-art-gallery";
import { getStorefrontNavSettings } from "@/lib/storefront-nav-settings";
import { prisma } from "@/lib/prisma";

export default async function SettingsAboutPage() {
  const [panes, productTypeOptions, eventOptions, knownArtGroups, nav] = await Promise.all([
    prisma.pane.findMany({
      where: { page: PageKey.ABOUT },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, type: true, sortOrder: true, config: true },
    }),
    prisma.productType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.event.findMany({
      orderBy: [{ startAt: "desc" }],
      select: { id: true, name: true },
    }),
    listKnownArtGroupNamesForAdmin(),
    getStorefrontNavSettings(),
  ]);
  const publicHref = storefrontPathForPageKey(PageKey.ABOUT);

  return (
    <div>
      <StorefrontNavHeaderPanel linkId="about" initial={nav.about} />
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">About page</h1>
      <p className="mt-4 text-ink/80">
        Build your public <strong>About us</strong> page with panes (HTML columns, carousels, promos). Use content panes
        for location, story, and links.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={publicHref}
          className={btnMainMd}
        >
          View About on the site
        </Link>
        <Link
          href="/settings/store"
          className="inline-flex items-center justify-center rounded border-2 border-lagoon-dark bg-surf px-4 py-3 text-center text-sm font-bold text-palm hover:bg-lagoon/20"
        >
          Store settings
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-black text-palm">About panes</h2>
        <HomePanesEditor
          pageKey={PageKey.ABOUT}
          initialPanes={panes}
          productTypeOptions={productTypeOptions}
          eventOptions={eventOptions}
          knownArtGroups={knownArtGroups}
        />
      </div>
    </div>
  );
}
