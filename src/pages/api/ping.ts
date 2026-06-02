import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Pages Router fallback — if this works but `/api/health` (App Router) does not,
 * the issue is App Router route registration on Vercel for this project.
 */
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, via: "pages-router" });
}
