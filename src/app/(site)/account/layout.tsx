import { auth as readAuthSession } from "@/auth";
import { AccountNav } from "@/components/account-nav";
import { countVisibleCustomerArtUploads } from "@/app/actions/customer-art";
import { countUnreadAdminRepliesForCustomer } from "@/lib/support-queries";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await readAuthSession().catch(() => null);
  const isCustomer = session?.user?.role === "customer" && session.user.id;
  let unread = 0;
  let showMyUploads = false;
  if (isCustomer) {
    [unread, showMyUploads] = await Promise.all([
      countUnreadAdminRepliesForCustomer(session.user.id),
      countVisibleCustomerArtUploads(session.user.id).then((n) => n > 0),
    ]);
  }

  return (
    <>
      {isCustomer ? (
        <div
          className="border-b px-6 pb-4 pt-6 sm:px-10"
          style={{
            borderColor: "color-mix(in srgb, var(--product-card-border) 28%, transparent)",
            backgroundColor: "color-mix(in srgb, var(--product-card-bg) 55%, transparent)",
          }}
        >
          <AccountNav unreadMessages={unread} showMyUploads={showMyUploads} />
        </div>
      ) : null}
      {children}
    </>
  );
}
