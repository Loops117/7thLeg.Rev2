import Link from "next/link";

export function AccountNav({ unreadMessages, showMyUploads }: { unreadMessages: number; showMyUploads: boolean }) {
  const linkCls =
    "rounded border-2 border-palm/25 bg-white/80 px-4 py-2 text-sm font-bold text-palm hover:border-palm hover:bg-surf/40";
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Account sections">
      <Link href="/account/orders" className={linkCls}>
        Orders
      </Link>
      <Link href="/account/wishlist" className={linkCls}>
        Wishlist
      </Link>
      {showMyUploads ? (
        <Link href="/account/uploads" className={linkCls}>
          My Uploads
        </Link>
      ) : null}
      <Link href="/account/messages" className={`${linkCls} relative`}>
        Messages
        {unreadMessages > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-coral px-1 text-[10px] font-black text-white">
            {unreadMessages > 9 ? "9+" : unreadMessages}
          </span>
        ) : null}
      </Link>
      <Link href="/account/points" className={linkCls}>
        Points
      </Link>
      <Link href="/account/profile" className={linkCls}>
        My info
      </Link>
    </nav>
  );
}
