import { NextResponse } from "next/server";
import {
  executeHarvestCycle,
  DEFAULT_HARVEST_CONFIG,
  type HarvestConfig,
} from "@/lib/services/harvester";
import { analyzeTokenSentiment } from "@/lib/services/sentiment";
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
 * POST /api/keeper/harvest
 *
 * Cron-callable endpoint for sentiment-based harvest decisions.
 *
 * Body (optional):
 * {
 *   vaultAddress?: string,
 *   strategyAddress?: string,
 *   rewardTokenSymbol?: string,
 *   bearishThreshold?: number,
 *   bullishThreshold?: number,
 *   normalHarvestIntervalMinutes?: number,
 *   lookbackHours?: number,
 *   maxNewsItems?: number
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

    const config: HarvestConfig = {
      vaultAddress: body.vaultAddress || defaultAddresses.vault,
      strategyAddress: body.strategyAddress || defaultAddresses.strategy,
      client: userClient,
      rewardTokenSymbol:
        body.rewardTokenSymbol ?? DEFAULT_HARVEST_CONFIG.rewardTokenSymbol,
      bearishThreshold:
        body.bearishThreshold ?? DEFAULT_HARVEST_CONFIG.bearishThreshold,
      bullishThreshold:
        body.bullishThreshold ?? DEFAULT_HARVEST_CONFIG.bullishThreshold,
      normalHarvestIntervalMinutes:
        body.normalHarvestIntervalMinutes ??
        DEFAULT_HARVEST_CONFIG.normalHarvestIntervalMinutes,
      lookbackHours: body.lookbackHours ?? DEFAULT_HARVEST_CONFIG.lookbackHours,
      maxNewsItems: body.maxNewsItems ?? DEFAULT_HARVEST_CONFIG.maxNewsItems,
    };

    const decision = await executeHarvestCycle(config);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: config.vaultAddress,
      strategy: config.strategyAddress,
      sessionScoped: Boolean(userClient),
      config: {
        rewardTokenSymbol: config.rewardTokenSymbol,
        bearishThreshold: config.bearishThreshold,
        bullishThreshold: config.bullishThreshold,
        normalHarvestIntervalMinutes: config.normalHarvestIntervalMinutes,
        lookbackHours: config.lookbackHours,
        maxNewsItems: config.maxNewsItems,
      },
      decision,
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
 * GET /api/keeper/harvest
 *
 * Returns latest sentiment snapshot without executing harvest.
 */
export async function GET(request: Request) {
  try {
    const defaultAddresses = getDefaultAddresses();
    const { searchParams } = new URL(request.url);
    const rewardTokenSymbol =
      searchParams.get("token") || DEFAULT_HARVEST_CONFIG.rewardTokenSymbol;

    const analysis = await analyzeTokenSentiment({
      tokenSymbol: rewardTokenSymbol,
      lookbackHours: DEFAULT_HARVEST_CONFIG.lookbackHours,
      maxItems: DEFAULT_HARVEST_CONFIG.maxNewsItems,
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      vault: defaultAddresses.vault,
      strategy: defaultAddresses.strategy,
      rewardTokenSymbol: rewardTokenSymbol.toUpperCase(),
      sentiment: analysis.sentiment,
      headlines: analysis.headlines,
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
