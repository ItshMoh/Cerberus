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
import {
  analyzeTokenSentiment,
  type SentimentResult,
} from "./sentiment";
import {
  executeHarvestCycle,
  DEFAULT_HARVEST_CONFIG,
  type HarvestConfig,
} from "./harvester";
import { INFRASTRUCTURE, getNetwork } from "../contracts/addresses";

// Helper to get default lending addresses
function getDefaultAddresses() {
  const network = getNetwork();
  return {
    lendingPool: INFRASTRUCTURE[network].lendingPool,
    vault: INFRASTRUCTURE[network].lendingPool,
    strategy: INFRASTRUCTURE[network].lendingPool,
  };
}

/**
 * Custom Vercel AI SDK tools for the keeper agent.
 * These are registered alongside Hedera Agent Kit tools in the chat API.
 */
export function getKeeperTools() {
  const defaultAddresses = getDefaultAddresses();
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
        "Execute the full rebalance cycle: assess volatility and decide whether to supply or withdraw from Bonzo Lending. High volatility → withdraw for safety. Low volatility → supply to earn yield.",
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
        supplyToken: z
          .string()
          .default("HBAR")
          .describe("Token to supply/withdraw from Bonzo Lending"),
        supplyAmount: z
          .string()
          .default("10")
          .describe("Amount to supply/withdraw"),
      }),
      execute: async ({
        volatilityThreshold,
        timeWindowMinutes,
        supplyToken,
        supplyAmount,
      }) => {
        const config: StrategyConfig = {
          vaultAddress: defaultAddresses.vault,
          strategyAddress: defaultAddresses.strategy,
          priceFeed: "HBAR/USD",
          volatilityThreshold,
          timeWindowMinutes,
          supplyToken,
          supplyAmount,
          narrowWidth: DEFAULT_STRATEGY_CONFIG.narrowWidth,
          wideWidth: DEFAULT_STRATEGY_CONFIG.wideWidth,
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
          lendingPool: defaultAddresses.lendingPool,
          regime: getCurrentRegime(defaultAddresses.strategy),
          priceWindowSize: getWindowSize("HBAR/USD"),
          network,
          type: "bonzo-lending",
        };
      },
    }),

    get_sentiment: tool({
      description:
        "Analyze current sentiment for a reward token using LunarCrush feeds and LLM scoring. Returns score (-1 to +1), label, confidence, and reasoning.",
      inputSchema: z.object({
        tokenSymbol: z
          .string()
          .default("SAUCE")
          .describe("Reward token symbol, e.g. SAUCE or BONZO"),
        lookbackHours: z
          .number()
          .min(1)
          .max(168)
          .default(24)
          .describe("How many hours of recent headlines to include"),
        maxItems: z
          .number()
          .min(5)
          .max(50)
          .default(20)
          .describe("Maximum number of headlines"),
      }),
      execute: async ({ tokenSymbol, lookbackHours, maxItems }) => {
        const { sentiment, headlines } = await analyzeTokenSentiment({
          tokenSymbol,
          lookbackHours,
          maxItems,
        });

        return {
          tokenSymbol: sentiment.tokenSymbol,
          score: sentiment.score,
          label: sentiment.label,
          confidence: sentiment.confidence,
          reasoning: sentiment.reasoning,
          signals: sentiment.signals,
          sourceCount: sentiment.sourceCount,
          fromCache: sentiment.fromCache,
          headlineCount: headlines.length,
        };
      },
    }),

    execute_harvest: tool({
      description:
        "Run sentiment-based harvest logic. Bearish -> harvest and (planned) swap to USDC, neutral -> scheduled harvest, bullish -> delay harvest.",
      inputSchema: z.object({
        rewardTokenSymbol: z
          .string()
          .default(DEFAULT_HARVEST_CONFIG.rewardTokenSymbol)
          .describe("Reward token to analyze"),
        bearishThreshold: z
          .number()
          .min(-1)
          .max(1)
          .default(DEFAULT_HARVEST_CONFIG.bearishThreshold)
          .describe("Harvest immediately below this score"),
        bullishThreshold: z
          .number()
          .min(-1)
          .max(1)
          .default(DEFAULT_HARVEST_CONFIG.bullishThreshold)
          .describe("Delay harvest above this score"),
      }),
      execute: async ({
        rewardTokenSymbol,
        bearishThreshold,
        bullishThreshold,
      }) => {
        const config: HarvestConfig = {
          vaultAddress: defaultAddresses.vault,
          strategyAddress: defaultAddresses.strategy,
          rewardTokenSymbol,
          bearishThreshold,
          bullishThreshold,
          normalHarvestIntervalMinutes:
            DEFAULT_HARVEST_CONFIG.normalHarvestIntervalMinutes,
          lookbackHours: DEFAULT_HARVEST_CONFIG.lookbackHours,
          maxNewsItems: DEFAULT_HARVEST_CONFIG.maxNewsItems,
        };

        const decision = await executeHarvestCycle(config);
        return {
          action: decision.action,
          reason: decision.reason,
          harvestExecuted: decision.harvestExecuted,
          harvestTxId: decision.harvestTxId,
          swap: decision.swap,
          error: decision.error,
          sentiment: decision.sentiment as SentimentResult,
        };
      },
    }),
  };
}
