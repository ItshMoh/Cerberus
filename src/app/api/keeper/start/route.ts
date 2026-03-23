import { NextResponse } from "next/server";
import {
  startKeeperOrchestrator,
  getKeeperOrchestratorStatus,
} from "@/lib/services/keeper-orchestrator";
import {
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionToken =
      resolveSessionTokenFromRequest(request) || body.sessionToken || undefined;

    if (sessionToken && !getSessionInfo(sessionToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid or expired session token",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    const state = await startKeeperOrchestrator({
      sessionToken,
      vaultAddress: body.vaultAddress,
      strategyAddress: body.strategyAddress,
      enableVolatility: body.enableVolatility,
      enableDepeg: body.enableDepeg,
      enableHarvest: body.enableHarvest,
      intervals: body.intervals,
    });

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

export async function GET(request: Request) {
  const sessionToken = resolveSessionTokenFromRequest(request) || undefined;
  const state = getKeeperOrchestratorStatus(sessionToken);
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    status: state,
  });
}

