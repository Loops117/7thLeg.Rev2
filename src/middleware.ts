import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Public short paths `/QR1`, `/QR2`, … rewrite to the internal redirect handler. */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const m = pathname.match(/^\/(QR\d+)$/i);
  if (!m) return NextResponse.next();

  const code = m[1].toUpperCase();
  const url = request.nextUrl.clone();
  url.pathname = `/qr-go/${code}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
