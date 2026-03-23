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
import { CLM_VAULTS, getNetwork } from "@/lib/contracts/addresses";

type VaultInfo = {
  vault: string;
  strategy: string;
  pool: string;
  token0: string;
  token1: string;
  positionWidth: number;
};

function getDefaultVault(): VaultInfo {
  const network = getNetwork();
  const vaults = CLM_VAULTS[network] as Record<string, VaultInfo>;
  return vaults["CLXY-SAUCE"];
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
    const defaultVault = getDefaultVault();

    const config: CircuitBreakerConfig = {
      vaultAddress: body.vaultAddress || defaultVault.vault,
      strategyAddress: body.strategyAddress || defaultVault.strategy,
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
    const defaultVault = getDefaultVault();

    const config: PegMonitorConfig = {
      warningThreshold: DEFAULT_CIRCUIT_BREAKER_CONFIG.warningThreshold,
      criticalThreshold: DEFAULT_CIRCUIT_BREAKER_CONFIG.criticalThreshold,
    };

    const assessment = await assessStablecoinPeg(config);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: defaultVault.vault,
      strategy: defaultVault.strategy,
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

