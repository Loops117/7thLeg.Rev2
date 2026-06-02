import { SpeciesSuggestionsAdmin } from "@/components/settings/species-suggestions-admin";
import {
  listApprovedSpeciesSuggestionsForAdmin,
  listSpeciesSuggestionsForAdmin,
} from "@/app/actions/species-suggestions";

export default async function SpeciesSuggestionsSettingsPage() {
  const [rows, approved] = await Promise.all([
    listSpeciesSuggestionsForAdmin(),
    listApprovedSpeciesSuggestionsForAdmin(),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Suggestions</h1>
      <p className="mt-4 max-w-2xl text-ink/80">
        Species and design ideas from <strong>Suggestion box</strong> panes on the home and about pages. Approve good
        ideas to show them in each pane&apos;s &quot;Recently approved&quot; list (limit is set per pane in Settings).
      </p>
      <div className="mt-6">
        <SpeciesSuggestionsAdmin initialRows={rows} initialApproved={approved} />
      </div>
    </div>
  );
}
