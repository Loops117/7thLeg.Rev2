import { PageKey } from "@/generated/prisma/enums";
import { HomePaneStack } from "@/components/panes/home-pane-stack";
import { loadPanesForPage } from "@/lib/panes-for-page";
import { settingsPathForPageKey } from "@/lib/pane-pages";

export default async function HomePage() {
  const panes = await loadPanesForPage(PageKey.HOME);

  return (
    <HomePaneStack
      panes={panes}
      emptyTitle="Home"
      emptySettingsPath={settingsPathForPageKey(PageKey.HOME)}
    />
  );
}
