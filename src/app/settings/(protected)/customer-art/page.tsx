import { CustomerArtAdmin } from "@/components/settings/customer-art-admin";
import {
  listCustomerArtSubmissionsForAdmin,
  listDistinctCustomerArtGroups,
} from "@/app/actions/customer-art";

export default async function CustomerArtSettingsPage() {
  const [rows, artGroups] = await Promise.all([
    listCustomerArtSubmissionsForAdmin(),
    listDistinctCustomerArtGroups(),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Customer Art</h1>
      <p className="mt-4 max-w-2xl text-ink/80">
        Submissions from <strong>Art Sub</strong> panes on the home page (and other pane pages). Each pane&apos;s{" "}
        <strong>Art group</strong> field tags uploads for filtering here.
      </p>
      <div className="mt-6">
        <CustomerArtAdmin initialRows={rows} artGroups={artGroups} />
      </div>
    </div>
  );
}
