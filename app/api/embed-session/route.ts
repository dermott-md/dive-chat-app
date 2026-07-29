import { NextRequest, NextResponse } from "next/server";
import { createEmbedSession } from "@/lib/embed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  diveId: string;
  version?: number;
  initialState?: Record<string, unknown>;
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
    });
    return NextResponse.json({ session });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
