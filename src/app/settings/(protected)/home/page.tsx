import Link from "next/link";
import { PageKey } from "@/generated/prisma/enums";
import { HomePageUrgentEditor } from "@/components/settings/home-page-urgent-editor";
import { HomePanesEditor } from "@/components/settings/home-panes-editor";
import { getHomePageUrgentForAdmin } from "@/lib/site-config";
import { btnMainMd } from "@/lib/btn-theme-classes";
import { listKnownArtGroupNamesForAdmin } from "@/lib/customer-art-gallery";
import { prisma } from "@/lib/prisma";

export default async function SettingsHomePage() {
  const [panes, productTypeOptions, eventOptions, urgentInitial, knownArtGroups] = await Promise.all([
    prisma.pane.findMany({
      where: { page: PageKey.HOME },
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
    getHomePageUrgentForAdmin(),
    listKnownArtGroupNamesForAdmin(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Home settings</h1>
      <p className="mt-4 text-ink/80">
        Add panes, set each pane’s <strong>background transparency</strong> (0–100%), and use <strong>Save pane</strong>{" "}
        per card. Reorder with Up / Down. Changes appear on the storefront home page immediately after save.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/"
          className={btnMainMd}
        >
          View storefront (landing)
        </Link>
        <Link
          href="/settings/store"
          className="inline-flex items-center justify-center rounded border-2 border-lagoon-dark bg-surf px-4 py-3 text-center text-sm font-bold text-palm hover:bg-lagoon/20"
        >
          Store settings
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-black text-palm dark:text-zinc-200">Home banner / urgent notice</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink/80 dark:text-zinc-400">
          Configure the dismissible overlay that covers the storefront home page until visitors acknowledge it — useful for
          short-lived announcements.
        </p>
        <HomePageUrgentEditor initial={urgentInitial} />
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-black text-palm dark:text-zinc-200">Home page panes</h2>
        <HomePanesEditor
          pageKey={PageKey.HOME}
          initialPanes={panes}
          productTypeOptions={productTypeOptions}
          eventOptions={eventOptions}
          knownArtGroups={knownArtGroups}
        />
      </div>
    </div>
  );
}
