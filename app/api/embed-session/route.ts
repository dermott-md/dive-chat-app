import { NextRequest, NextResponse } from "next/server";
import { createEmbedSession } from "@/lib/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  diveId: string;
  version?: number;
  initialState?: Record<string, unknown>;
}

/**
 * Optional: attach specific shares/databases to every embed session, so a
 * read-only service account can serve a dive whose data lives behind a share.
 * Set EMBED_REQUIRED_RESOURCES to a JSON array, e.g.
 *   [{"url":"md:_share/foo/<uuid>","alias":"my_db"}]
 */
function envRequiredResources(): { url: string; alias: string }[] | undefined {
  const raw = process.env.EMBED_REQUIRED_RESOURCES;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : undefined;
  } catch {
    console.warn("[embed-session] EMBED_REQUIRED_RESOURCES is not valid JSON — ignoring.");
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.diveId) {
    return NextResponse.json({ error: "diveId is required" }, { status: 400 });
  }

  if (!process.env.MOTHERDUCK_TOKEN || !process.env.MD_SERVICE_ACCOUNT_USERNAME) {
    return NextResponse.json(
      {
        error:
          "Server not configured. Set MOTHERDUCK_TOKEN and MD_SERVICE_ACCOUNT_USERNAME in your environment.",
      },
      { status: 500 },
    );
  }

  try {
    const session = await createEmbedSession(body.diveId, {
      version: body.version,
      initialState: body.initialState,
      requiredResources: envRequiredResources(),
    });
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
