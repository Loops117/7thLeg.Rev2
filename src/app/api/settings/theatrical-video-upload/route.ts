import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth as readAuthSession } from "@/auth";
import {
  isValidTheatricalVideoBlobPath,
  THEATRICAL_VIDEO_ALLOWED_TYPES,
  THEATRICAL_VIDEO_MAX_BYTES,
} from "@/lib/theatrical-video-upload";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await readAuthSession().catch(() => null);
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Video storage is not configured. Connect Vercel Blob to this project and set BLOB_READ_WRITE_TOKEN.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidTheatricalVideoBlobPath(pathname)) {
          throw new Error("Invalid upload path.");
        }

        return {
          allowedContentTypes: [...THEATRICAL_VIDEO_ALLOWED_TYPES],
          maximumSizeInBytes: THEATRICAL_VIDEO_MAX_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Upload URL is returned to the client; pane save persists it.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
