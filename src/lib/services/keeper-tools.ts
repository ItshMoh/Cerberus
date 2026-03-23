import { tool } from "ai";
import { z } from "zod";
import {
  executeRebalanceCycle,
  getCurrentRegime,
  DEFAULT_STRATEGY_CONFIG,
  type StrategyConfig,
} from "./rebalancer";
import {
  assessVolatility,
  fetchPythPrice,
  getWindowSize,
  type FeedId,
} from "./volatility-monitor";
import { CLM_VAULTS, getNetwork } from "../contracts/addresses";

// Helper to get default vault — handles the `as const` indexing
function getDefaultVault() {
  const network = getNetwork();
  const vaults = CLM_VAULTS[network] as Record<
    string,
    {
      vault: string;
      strategy: string;
      pool: string;
      token0: string;
      token1: string;
      positionWidth: number;
    }
  >;
  return vaults["CLXY-SAUCE"];
}

/**
 * Custom Vercel AI SDK tools for the keeper agent.
 * These are registered alongside Hedera Agent Kit tools in the chat API.
 */
export function getKeeperTools() {
  const defaultVault = getDefaultVault();
  const network = getNetwork();

  return {
    check_volatility: tool({
      description:
        "Check current price volatility for a token pair. Returns the current price, price delta %, realized volatility, and whether the volatility threshold has been exceeded. Use this to monitor market conditions before deciding on rebalancing.",
      inputSchema: z.object({
        priceFeed: z
          .enum(["HBAR/USD", "USDC/USD"])
          .default("HBAR/USD")
          .describe("The price feed to check"),
        windowMinutes: z
          .number()
          .min(1)
          .max(120)
          .default(20)
          .describe("Rolling time window in minutes"),
        threshold: z
          .number()
          .min(0.1)
          .max(20)
          .default(3)
          .describe("Volatility threshold percentage"),
      }),
      execute: async ({ priceFeed, windowMinutes, threshold }) => {
        const volatility = await assessVolatility(
          priceFeed as FeedId,
          windowMinutes,
          threshold
        );
        return {
          currentPrice: volatility.currentPrice,
          priceDeltaPercent: Number(volatility.priceDeltaPercent.toFixed(4)),
          realizedVolatility: Number(volatility.realizedVolatility.toFixed(4)),
          isHighVolatility: volatility.isHighVolatility,
          threshold: volatility.threshold,
          windowMinutes: volatility.windowMinutes,
          dataPoints: volatility.priceHistory.length,
        };
      },
    }),

    get_price: tool({
      description:
        "Get the latest price for HBAR/USD or USDC/USD from Pyth Network oracle. Returns the price and confidence interval.",
      inputSchema: z.object({
        priceFeed: z
          .enum(["HBAR/USD", "USDC/USD"])
          .default("HBAR/USD")
          .describe("The price feed to query"),
      }),
      execute: async ({ priceFeed }) => {
        const price = await fetchPythPrice(priceFeed as FeedId);
        return {
          feed: priceFeed,
          price: price.price,
          confidence: price.confidence,
          timestamp: new Date(price.timestamp * 1000).toISOString(),
        };
      },
    }),

    execute_rebalance: tool({
      description:
        "Execute the full rebalance cycle on a vault: assess volatility, decide whether to widen or tighten the range, and execute if needed. This calls moveTicks() on the vault strategy contract. Only use this when the user asks to rebalance or when automated keeper logic determines it's necessary.",
      inputSchema: z.object({
        volatilityThreshold: z
          .number()
          .min(0.1)
          .max(20)
          .default(3)
          .describe("% price change to trigger volatility alert"),
        timeWindowMinutes: z
          .number()
          .min(1)
          .max(120)
          .default(20)
          .describe("Rolling time window in minutes"),
        narrowWidth: z
          .number()
          .default(100)
          .describe("Position width for calm markets"),
        wideWidth: z
          .number()
          .default(400)
          .describe("Position width for volatile markets"),
      }),
      execute: async ({
        volatilityThreshold,
        timeWindowMinutes,
        narrowWidth,
        wideWidth,
      }) => {
        const config: StrategyConfig = {
          vaultAddress: defaultVault.vault,
          strategyAddress: defaultVault.strategy,
          priceFeed: "HBAR/USD",
          volatilityThreshold,
          timeWindowMinutes,
          narrowWidth,
          wideWidth,
          cooldownMinutes: DEFAULT_STRATEGY_CONFIG.cooldownMinutes,
          settleMultiplier: DEFAULT_STRATEGY_CONFIG.settleMultiplier,
        };

        const decision = await executeRebalanceCycle(config);
        return {
          action: decision.action,
          reason: decision.reason,
          executed: decision.executed,
          transactionId: decision.transactionId,
          error: decision.error,
          currentWidth: decision.currentWidth,
          targetWidth: decision.targetWidth,
          currentPrice: decision.volatility.currentPrice,
          priceDeltaPercent: Number(
            decision.volatility.priceDeltaPercent.toFixed(4)
          ),
          regime: getCurrentRegime(config.strategyAddress),
        };
      },
    }),

    get_keeper_status: tool({
      description:
        "Get the current status of the keeper agent for a vault — the current volatility regime (HIGH/LOW/UNKNOWN), price window size, and vault/strategy addresses.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          vault: defaultVault.vault,
          strategy: defaultVault.strategy,
          regime: getCurrentRegime(defaultVault.strategy),
          priceWindowSize: getWindowSize("HBAR/USD"),
          network,
        };
      },
    }),
  };
}
