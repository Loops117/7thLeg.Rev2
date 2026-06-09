import { auth as readAuthSession } from "@/auth";
import { redirect } from "next/navigation";
import { countUnreadCustomerSupportMessages } from "@/lib/support-queries";
import { SettingsAdminSidebar } from "@/components/settings-admin-sidebar";
import { SettingsAdminHydrateAppearance } from "@/components/settings/admin-appearance";
import { SettingsAreaPageFrame } from "@/components/settings/settings-area-page-frame";

export default async function SettingsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/settings/login");
  }

  const unreadSupportCount = await countUnreadCustomerSupportMessages();

  return (
    <div
      id="settings-admin-shell"
      className="flex min-h-dvh bg-white text-ink transition-colors duration-150 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <SettingsAdminHydrateAppearance />
      <SettingsAdminSidebar unreadSupportCount={unreadSupportCount} />
      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
        <div className="flex min-h-12 items-center border-b-4 border-palm bg-[#0f2d22] pl-12 pr-4 py-2 text-white dark:border-zinc-800 dark:bg-black md:hidden">
          <p className="text-sm font-bold text-white dark:text-zinc-200">Admin</p>
        </div>
        <div className="min-w-0 flex-1 bg-white dark:bg-transparent">
          <div className="admin-settings-body min-w-0 max-w-full p-4 sm:p-6">
            <SettingsAreaPageFrame>{children}</SettingsAreaPageFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
