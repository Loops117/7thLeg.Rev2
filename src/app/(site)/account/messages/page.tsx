import Link from "next/link";
import { auth as readAuthSession } from "@/auth";
import {
  listCustomerSupportMessages,
  markAdminRepliesReadForCustomer,
} from "@/app/actions/support-messages";
import { AccountMessagesClient } from "@/components/account-messages-client";

export default async function AccountMessagesPage() {
  const session = await readAuthSession().catch(() => null);

  if (!session?.user) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Messages</h1>
        <p className="mt-6 max-w-xl text-ink/85">
          <Link href="/login?callbackUrl=/account/messages" className="font-bold text-lagoon-dark underline">
            Log in
          </Link>{" "}
          to message the store.
        </p>
      </div>
    );
  }

  if (session.user.role !== "customer" || !session.user.id) {
    return (
      <div className="p-6 sm:p-10">
        <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Messages</h1>
        <p className="mt-6 text-ink/80">Customer messages are available on a customer account.</p>
      </div>
    );
  }

  await markAdminRepliesReadForCustomer();
  const initialMessages = await listCustomerSupportMessages();

  return (
    <div className="p-6 sm:p-10">
      <h1 className="border-b-4 border-palm pb-4 text-2xl font-black text-palm">Messages</h1>
      <p className="mt-4 max-w-xl text-sm text-ink/75">
        Your conversation with the store. Replies from staff appear here and in the chat bubble when you’re browsing the
        site.
      </p>
      <AccountMessagesClient initialMessages={initialMessages} />
    </div>
  );
}
