import { NextResponse } from "next/server";
import {
  executeRebalanceCycle,
  getCurrentRegime,
  DEFAULT_STRATEGY_CONFIG,
  type StrategyConfig,
} from "@/lib/services/rebalancer";
import { getWindowSize, type FeedId } from "@/lib/services/volatility-monitor";
import { INFRASTRUCTURE, getNetwork } from "@/lib/contracts/addresses";
import {
  getClientForSession,
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

function getDefaultAddresses() {
  const network = getNetwork();
  return {
    lendingPool: INFRASTRUCTURE[network].lendingPool,
    // Use lending pool address as both vault and strategy for keying purposes
    vault: INFRASTRUCTURE[network].lendingPool,
    strategy: INFRASTRUCTURE[network].lendingPool,
  };
}

/**
 * POST /api/keeper/rebalance
 *
 * Runs the volatility check and lending position rebalance cycle.
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
    const defaults = getDefaultAddresses();

    const config: StrategyConfig = {
      vaultAddress: body.vaultAddress || defaults.vault,
      strategyAddress: body.strategyAddress || defaults.strategy,
      client: userClient,
      priceFeed: (body.priceFeed as FeedId) || DEFAULT_STRATEGY_CONFIG.priceFeed,
      volatilityThreshold:
        body.volatilityThreshold ?? DEFAULT_STRATEGY_CONFIG.volatilityThreshold,
      timeWindowMinutes:
        body.timeWindowMinutes ?? DEFAULT_STRATEGY_CONFIG.timeWindowMinutes,
      supplyToken: body.supplyToken ?? DEFAULT_STRATEGY_CONFIG.supplyToken,
      supplyAmount: body.supplyAmount ?? DEFAULT_STRATEGY_CONFIG.supplyAmount,
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
      lendingPool: defaults.lendingPool,
      sessionScoped: Boolean(userClient),
      regime: getCurrentRegime(config.strategyAddress),
      priceWindowSize: getWindowSize(config.priceFeed),
      decision: {
        action: decision.action,
        reason: decision.reason,
        executed: decision.executed,
        transactionId: decision.transactionId,
        error: decision.error,
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
 */
export async function GET() {
  try {
    const defaults = getDefaultAddresses();

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
      lendingPool: defaults.lendingPool,
      regime: getCurrentRegime(defaults.strategy),
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
