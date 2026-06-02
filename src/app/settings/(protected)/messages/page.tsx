import Link from "next/link";
import {
  listAdminSupportThreads,
  listMessagesForAdminThread,
  markCustomerMessagesReadForAdmin,
} from "@/app/actions/support-messages";
import { AdminSupportReplyForm } from "@/components/admin-support-reply-form";

type Props = { searchParams: Promise<{ t?: string }> };

export default async function SettingsMessagesPage({ searchParams }: Props) {
  const { t } = await searchParams;
  let threads = await listAdminSupportThreads();

  let detail: Awaited<ReturnType<typeof listMessagesForAdminThread>> | null = null;
  if (t && threads.some((row) => row.id === t)) {
    await markCustomerMessagesReadForAdmin(t);
    threads = await listAdminSupportThreads();
    detail = await listMessagesForAdminThread(t);
  }

  return (
    <div>
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm dark:border-zinc-600 dark:text-zinc-100">
        Messages
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-ink/80 dark:text-zinc-400">
        Customer conversations from the storefront chat and account Messages page. Unread counts reset when you open a
        thread.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-palm-mid dark:text-zinc-500">Inbox</h2>
          {threads.length === 0 ? (
            <p className="mt-3 text-sm text-ink/70 dark:text-zinc-400">No conversations yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {threads.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/settings/messages?t=${encodeURIComponent(row.id)}`}
                    className={`block rounded border-2 px-3 py-2 text-sm transition hover:bg-surf/50 dark:hover:bg-zinc-900 ${
                      row.id === t
                        ? "border-palm bg-palm/10 font-bold text-palm dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
                        : "border-transparent text-ink dark:text-zinc-200"
                    }`}
                  >
                    <span className="line-clamp-2">{row.customerLabel}</span>
                    {row.unreadCount > 0 ? (
                      <span className="mt-1 inline-block rounded-full bg-coral px-2 py-0.5 text-[10px] font-black text-white">
                        {row.unreadCount} new
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {!t ? (
            <p className="text-sm text-ink/70 dark:text-zinc-400">Choose a customer on the left to read and reply.</p>
          ) : !detail ? (
            <p className="text-sm text-coral">That conversation was not found.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-black text-palm dark:text-zinc-100">
                  {threads.find((x) => x.id === t)?.customerLabel ?? "Customer"}
                </h2>
                <p className="font-mono text-xs text-ink/55 dark:text-zinc-500">
                  {threads.find((x) => x.id === t)?.customerEmail}
                </p>
              </div>
              <div className="mt-4 max-h-[min(32rem,60dvh)] space-y-3 overflow-y-auto rounded border-2 border-palm/20 bg-white/90 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                {detail.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[92%] rounded border px-3 py-2 text-sm ${
                      m.sender === "ADMIN"
                        ? "ml-auto border-palm/30 bg-palm/10 text-ink dark:text-zinc-100"
                        : "border-palm/15 bg-sand text-ink dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="mt-1 text-[10px] text-ink/45 dark:text-zinc-500">
                      {m.sender === "ADMIN" ? "You" : "Customer"} ·{" "}
                      {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                ))}
              </div>
              <AdminSupportReplyForm threadId={t} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
