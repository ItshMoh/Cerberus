import { NextResponse } from "next/server";
import { stopKeeperOrchestrator } from "@/lib/services/keeper-orchestrator";
import { resolveSessionTokenFromRequest } from "@/lib/services/user-session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionToken =
      resolveSessionTokenFromRequest(request) || body.sessionToken || undefined;

    const state = stopKeeperOrchestrator(sessionToken);
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      status: state,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

