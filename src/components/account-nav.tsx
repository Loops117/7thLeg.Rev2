import Link from "next/link";

export function AccountNav({ unreadMessages, showMyUploads }: { unreadMessages: number; showMyUploads: boolean }) {
  const linkCls =
    "rounded border-2 px-4 py-2 text-sm font-bold transition-colors hover:brightness-95";
  const linkStyle = {
    borderColor: "color-mix(in srgb, var(--product-card-border) 45%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--product-card-bg) 92%, transparent)",
    color: "var(--product-card-title)",
  } as const;
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Account sections">
      <Link href="/account/orders" className={linkCls} style={linkStyle}>
        Orders
      </Link>
      <Link href="/account/wishlist" className={linkCls} style={linkStyle}>
        Wishlist
      </Link>
      <Link href="/account/species" className={linkCls} style={linkStyle}>
        My Species
      </Link>
      {showMyUploads ? (
        <Link href="/account/uploads" className={linkCls} style={linkStyle}>
          My Uploads
        </Link>
      ) : null}
      <Link href="/account/messages" className={`${linkCls} relative`} style={linkStyle}>
        Messages
        {unreadMessages > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-white bg-coral px-1 text-[10px] font-black text-white">
            {unreadMessages > 9 ? "9+" : unreadMessages}
          </span>
        ) : null}
      </Link>
      <Link href="/account/points" className={linkCls} style={linkStyle}>
        Points
      </Link>
      <Link href="/account/profile" className={linkCls} style={linkStyle}>
        My info
      </Link>
    </nav>
  );
}
