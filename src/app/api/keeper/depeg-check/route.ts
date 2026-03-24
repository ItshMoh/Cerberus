import { NextResponse } from "next/server";
import {
  executeCircuitBreakerCycle,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type CircuitBreakerConfig,
} from "@/lib/services/circuit-breaker";
import {
  assessStablecoinPeg,
  type PegFeedId,
  type PegMonitorConfig,
} from "@/lib/services/peg-monitor";
import { INFRASTRUCTURE, getNetwork } from "@/lib/contracts/addresses";
import {
  getClientForSession,
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

function getDefaultAddresses() {
  const network = getNetwork();
  const lendingPool = INFRASTRUCTURE[network].lendingPool;
  return { vault: lendingPool, strategy: lendingPool };
}

/**
 * POST /api/keeper/depeg-check
 *
 * Cron-callable endpoint for stablecoin de-peg monitoring and emergency actions.
 *
 * Body (optional):
 * {
 *   vaultAddress?: string,
 *   strategyAddress?: string,
 *   monitoredFeed?: "USDC/USD" | "USDT/USD",
 *   warningThreshold?: number,   // default 0.99
 *   criticalThreshold?: number,  // default 0.98
 *   safeTokenSymbol?: string,    // default HBAR
 *   safeDepositAmount?: string,  // default "0" (skip deposit)
 *   onBehalfOf?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionToken =
      resolveSessionTokenFromRequest(request) || body.sessionToken || undefined;
    const userClient =
      sessionToken && getSessionInfo(sessionToken)
        ? getClientForSession(sessionToken)
        : undefined;
    const defaultAddresses = getDefaultAddresses();

    const config: CircuitBreakerConfig = {
      vaultAddress: body.vaultAddress || defaultAddresses.vault,
      strategyAddress: body.strategyAddress || defaultAddresses.strategy,
      client: userClient,
      monitoredFeed:
        (body.monitoredFeed as PegFeedId) ||
        DEFAULT_CIRCUIT_BREAKER_CONFIG.monitoredFeed,
      warningThreshold:
        body.warningThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.warningThreshold,
      criticalThreshold:
        body.criticalThreshold ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.criticalThreshold,
      safeTokenSymbol:
        body.safeTokenSymbol ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.safeTokenSymbol,
      safeDepositAmount:
        body.safeDepositAmount ?? DEFAULT_CIRCUIT_BREAKER_CONFIG.safeDepositAmount,
      onBehalfOf: body.onBehalfOf,
    };

    const decision = await executeCircuitBreakerCycle(config);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: config.vaultAddress,
      strategy: config.strategyAddress,
      sessionScoped: Boolean(userClient),
      config: {
        monitoredFeed: config.monitoredFeed,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
        safeTokenSymbol: config.safeTokenSymbol,
        safeDepositAmount: config.safeDepositAmount,
        onBehalfOf: config.onBehalfOf || null,
      },
      decision: {
        action: decision.action,
        reason: decision.reason,
        alertLevel: decision.alertLevel,
        monitoredFeed: decision.monitoredFeed,
        monitoredPrice: decision.monitoredPrice,
        panicExecuted: decision.panicExecuted,
        panicTransactionId: decision.panicTransactionId,
        lendingAction: decision.lendingAction,
        error: decision.error,
      },
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

/**
 * GET /api/keeper/depeg-check
 *
 * Returns current peg status for monitoring without executing keeper actions.
 */
export async function GET() {
  try {
    const defaultAddresses = getDefaultAddresses();

    const config: PegMonitorConfig = {
      warningThreshold: DEFAULT_CIRCUIT_BREAKER_CONFIG.warningThreshold,
      criticalThreshold: DEFAULT_CIRCUIT_BREAKER_CONFIG.criticalThreshold,
    };

    const assessment = await assessStablecoinPeg(config);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: defaultAddresses.vault,
      strategy: defaultAddresses.strategy,
      overallAlert: assessment.overallAlert,
      warningCount: assessment.warningCount,
      criticalCount: assessment.criticalCount,
      prices: assessment.prices.map((p) => ({
        feed: p.feed,
        price: p.price,
        confidence: p.confidence,
        publishTime: new Date(p.publishTime * 1000).toISOString(),
        distanceFromPegPercent: p.distanceFromPegPercent,
        alertLevel: p.alertLevel,
        warningThreshold: p.warningThreshold,
        criticalThreshold: p.criticalThreshold,
      })),
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
