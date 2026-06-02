"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { btnMain, btnMainMd, btnSecondarySm } from "@/lib/btn-theme-classes";
import { isLabelEditorPath } from "@/lib/label-editor-path";
import {
  listCustomerSupportMessages,
  markAdminRepliesReadForCustomer,
  sendCustomerSupportMessage,
  type SupportMessageRow,
} from "@/app/actions/support-messages";

export function SupportChatBubble({ initialUnread }: { initialUnread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [messages, setMessages] = useState<SupportMessageRow[] | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const rows = await listCustomerSupportMessages();
        setMessages(rows);
        setTimeout(scrollToBottom, 0);
      } catch {
        setErr("Could not load messages.");
      }
    });
  }, [scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    void markAdminRepliesReadForCustomer();
    setUnread(0);
    load();
  }, [open, load]);

  useEffect(() => {
    if (open && messages) setTimeout(scrollToBottom, 0);
  }, [open, messages, scrollToBottom]);

  function send() {
    setErr(null);
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      try {
        await sendCustomerSupportMessage(body);
        setText("");
        const rows = await listCustomerSupportMessages();
        setMessages(rows);
        setTimeout(scrollToBottom, 0);
      } catch {
        setErr("Could not send. Try again.");
      }
    });
  }

  if (isLabelEditorPath(pathname)) return null;

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col items-end p-4 sm:p-6">
      {open ? (
        <div
          className="pointer-events-auto mb-3 flex max-h-[min(28rem,70dvh)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded border-4 border-palm bg-sand shadow-lg"
          role="dialog"
          aria-label="Messages to the store"
        >
          <div className="flex items-center justify-between border-b-2 border-palm/25 bg-white/90 px-3 py-2">
            <p className="text-sm font-black text-palm">Message the store</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={btnSecondarySm}
            >
              Close
            </button>
          </div>
          <p className="border-b border-palm/15 px-3 py-2 text-[11px] text-ink/70">
            Replies also appear under{" "}
            <Link href="/account/messages" className="font-bold text-lagoon-dark underline">
              Account → Messages
            </Link>
            .
          </p>
          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {messages === null && !err ? (
              <p className="text-center text-xs text-ink/60">{pending ? "Loading…" : "…"}</p>
            ) : null}
            {err ? <p className="text-center text-xs text-coral">{err}</p> : null}
            {messages?.map((m) => (
              <div
                key={m.id}
                className={`max-w-[92%] rounded border px-2 py-1.5 text-sm ${
                  m.sender === "CUSTOMER"
                    ? "ml-auto border-palm/30 bg-palm/10 text-ink"
                    : "border-palm/20 bg-white text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-1 text-[10px] text-ink/45">
                  {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t-2 border-palm/25 bg-white/95 p-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Write a message…"
              className="w-full resize-none border-2 border-palm/30 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={pending || !text.trim()}
              onClick={send}
              className={`mt-2 w-full ${btnMainMd}`}
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full border-4 p-0 text-2xl shadow-md ${btnMain}`}
        aria-label={open ? "Close messages" : "Open messages to the store"}
      >
        <span aria-hidden>💬</span>
        {!open && unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-white bg-coral px-1 text-xs font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
