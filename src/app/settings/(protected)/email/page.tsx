import { getEmailAdminPanelData } from "@/app/actions/email-admin";
import { EmailSettingsEditor } from "@/components/settings/email-settings-editor";

export default async function SettingsEmailPage() {
  const initial = await getEmailAdminPanelData();

  return (
    <div className="max-w-3xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:text-emerald-300">Email</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/80 dark:text-zinc-400">
        Check that Resend is connected and send a test message to any inbox. Customer emails (password reset, giveaway
        winners) use the same connection.
      </p>
      <div className="mt-10">
        <EmailSettingsEditor initial={initial} />
      </div>
    </div>
  );
}
