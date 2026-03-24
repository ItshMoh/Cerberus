import { NextResponse } from "next/server";
import { getBonzoMarketData } from "@/lib/services/lending-reader";
import { INFRASTRUCTURE, getNetwork } from "@/lib/contracts/addresses";
import {
  getClientForSession,
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

/**
 * GET /api/vault-test
 *
 * Returns Bonzo Lending market data and lending pool info.
 */
export async function GET(request: Request) {
  try {
    const sessionToken = resolveSessionTokenFromRequest(request) || undefined;
    const client =
      sessionToken && getSessionInfo(sessionToken)
        ? getClientForSession(sessionToken)
        : undefined;

    const network = getNetwork();
    const lendingPool = INFRASTRUCTURE[network].lendingPool;

    const marketData = await getBonzoMarketData(client);

    return NextResponse.json({
      ok: true,
      network,
      lendingPool,
      type: "bonzo-lending",
      marketData: marketData.raw,
      available: marketData.available,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
