import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "site_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

function normalizePath(raw: string): string {
  const p = raw.trim() || "/";
  if (!p.startsWith("/")) return `/${p}`;
  return p.length > 240 ? p.slice(0, 240) : p;
}

function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function POST(req: Request) {
  let body: { path?: string };
  try {
    body = (await req.json()) as { path?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = normalizePath(body.path ?? "/");
  if (path.startsWith("/settings") || path.startsWith("/api")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const jar = await cookies();
  let sessionKey = jar.get(SESSION_COOKIE)?.value?.trim();
  if (!sessionKey) {
    sessionKey = randomBytes(16).toString("hex");
    jar.set(SESSION_COOKIE, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  const day = utcDay();

  try {
    await prisma.$transaction([
      prisma.analyticsPageImpression.create({
        data: { path, sessionKey },
      }),
      prisma.analyticsPageVisit.upsert({
        where: {
          sessionKey_path_visitDay: {
            sessionKey,
            path,
            visitDay: day,
          },
        },
        create: { path, sessionKey, visitDay: day },
        update: {},
      }),
    ]);
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
