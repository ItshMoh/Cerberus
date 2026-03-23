import { NextResponse } from "next/server";
import {
  executeRebalanceCycle,
  getCurrentRegime,
  DEFAULT_STRATEGY_CONFIG,
  type StrategyConfig,
} from "@/lib/services/rebalancer";
import { getWindowSize, type FeedId } from "@/lib/services/volatility-monitor";
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
 * POST /api/keeper/rebalance
 *
 * Cron-callable endpoint that runs the volatility check-and-rebalance cycle.
 *
 * Body (optional — uses defaults for CLXY-SAUCE vault if omitted):
 * {
 *   vaultAddress?: string,
 *   strategyAddress?: string,
 *   priceFeed?: "HBAR/USD",
 *   volatilityThreshold?: number,
 *   timeWindowMinutes?: number,
 *   narrowWidth?: number,
 *   wideWidth?: number,
 *   cooldownMinutes?: number,
 *   settleMultiplier?: number
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const defaultVault = getDefaultVault();

    const config: StrategyConfig = {
      vaultAddress: body.vaultAddress || defaultVault.vault,
      strategyAddress: body.strategyAddress || defaultVault.strategy,
      priceFeed: (body.priceFeed as FeedId) || DEFAULT_STRATEGY_CONFIG.priceFeed,
      volatilityThreshold:
        body.volatilityThreshold ?? DEFAULT_STRATEGY_CONFIG.volatilityThreshold,
      timeWindowMinutes:
        body.timeWindowMinutes ?? DEFAULT_STRATEGY_CONFIG.timeWindowMinutes,
      narrowWidth: body.narrowWidth ?? DEFAULT_STRATEGY_CONFIG.narrowWidth,
      wideWidth: body.wideWidth ?? DEFAULT_STRATEGY_CONFIG.wideWidth,
      cooldownMinutes: body.cooldownMinutes ?? DEFAULT_STRATEGY_CONFIG.cooldownMinutes,
      settleMultiplier:
        body.settleMultiplier ?? DEFAULT_STRATEGY_CONFIG.settleMultiplier,
    };

    const decision = await executeRebalanceCycle(config);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: config.vaultAddress,
      strategy: config.strategyAddress,
      regime: getCurrentRegime(config.strategyAddress),
      priceWindowSize: getWindowSize(config.priceFeed),
      decision: {
        action: decision.action,
        reason: decision.reason,
        executed: decision.executed,
        transactionId: decision.transactionId,
        error: decision.error,
        currentWidth: decision.currentWidth,
        targetWidth: decision.targetWidth,
      },
      volatility: {
        currentPrice: decision.volatility.currentPrice,
        priceDeltaPercent: decision.volatility.priceDeltaPercent,
        realizedVolatility: decision.volatility.realizedVolatility,
        windowMinutes: decision.volatility.windowMinutes,
        isHighVolatility: decision.volatility.isHighVolatility,
        threshold: decision.volatility.threshold,
        dataPoints: decision.volatility.priceHistory.length,
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
 * GET /api/keeper/rebalance
 *
 * Returns the current volatility state without executing any actions.
 * Useful for monitoring / dashboard display.
 */
export async function GET() {
  try {
    const defaultVault = getDefaultVault();

    // Import inline to avoid circular issues
    const { assessVolatility, getWindowSize } = await import(
      "@/lib/services/volatility-monitor"
    );

    const volatility = await assessVolatility(
      "HBAR/USD",
      DEFAULT_STRATEGY_CONFIG.timeWindowMinutes,
      DEFAULT_STRATEGY_CONFIG.volatilityThreshold
    );

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: defaultVault.vault,
      strategy: defaultVault.strategy,
      regime: getCurrentRegime(defaultVault.strategy),
      priceWindowSize: getWindowSize("HBAR/USD"),
      volatility: {
        currentPrice: volatility.currentPrice,
        priceDeltaPercent: volatility.priceDeltaPercent,
        realizedVolatility: volatility.realizedVolatility,
        windowMinutes: volatility.windowMinutes,
        isHighVolatility: volatility.isHighVolatility,
        threshold: volatility.threshold,
        dataPoints: volatility.priceHistory.length,
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
