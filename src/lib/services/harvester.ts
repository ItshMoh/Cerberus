import type { Client } from "@hashgraph/sdk";
import { withdrawFromBonzo } from "./lending-reader";
import { analyzeTokenSentiment, type SentimentResult } from "./sentiment";
import { logHarvestDecision } from "./hcs-logger";

export interface HarvestConfig {
  vaultAddress: string;
  strategyAddress: string;
  client?: Client;
  rewardTokenSymbol: string;
  // Decision thresholds
  bearishThreshold: number; // default: -0.2
  bullishThreshold: number; // default: 0.2
  // Neutral cadence
  normalHarvestIntervalMinutes: number; // default: 240 (4h)
  // Sentiment input scope
  lookbackHours: number; // default: 24
  maxNewsItems: number; // default: 20
}

export const DEFAULT_HARVEST_CONFIG: Omit<
  HarvestConfig,
  "vaultAddress" | "strategyAddress"
> = {
  rewardTokenSymbol: "SAUCE",
  bearishThreshold: -0.2,
  bullishThreshold: 0.2,
  normalHarvestIntervalMinutes: 240,
  lookbackHours: 24,
  maxNewsItems: 20,
};

export type HarvestAction =
  | "HARVEST_AND_SWAP_TO_USDC"
  | "HARVEST_NOW"
  | "DELAY_HARVEST"
  | "NO_ACTION";

export interface SwapResult {
  attempted: boolean;
  executed: boolean;
  txId: string | null;
  error: string | null;
}

export interface HarvestDecision {
  action: HarvestAction;
  reason: string;
  sentiment: SentimentResult;
  harvestExecuted: boolean;
  harvestTxId: string | null;
  swap: SwapResult;
  error: string | null;
  timeSinceLastHarvestMinutes: number | null;
}

const lastHarvestActionTime = new Map<string, number>();

function minutesSinceLast(strategyAddress: string): number | null {
  const last = lastHarvestActionTime.get(strategyAddress);
  if (!last) return null;
  return Math.floor((Date.now() - last) / 60_000);
}

function setLastHarvestNow(strategyAddress: string): void {
  lastHarvestActionTime.set(strategyAddress, Date.now());
}

function decideHarvestAction(
  score: number,
  config: HarvestConfig,
  elapsedMinutes: number | null
): { action: HarvestAction; reason: string } {
  if (score <= config.bearishThreshold) {
    return {
      action: "HARVEST_AND_SWAP_TO_USDC",
      reason: `Sentiment bearish (${score.toFixed(4)} <= ${config.bearishThreshold}). Withdrawing ${config.rewardTokenSymbol} from lending and moving to USDC for safety.`,
    };
  }

  if (score >= config.bullishThreshold) {
    return {
      action: "DELAY_HARVEST",
      reason: `Sentiment bullish (${score.toFixed(4)} >= ${config.bullishThreshold}). Keeping ${config.rewardTokenSymbol} supplied in Bonzo Lending to earn yield.`,
    };
  }

  if (elapsedMinutes === null || elapsedMinutes >= config.normalHarvestIntervalMinutes) {
    return {
      action: "HARVEST_NOW",
      reason: `Sentiment neutral (${score.toFixed(4)}). Normal rebalance interval reached — checking lending positions.`,
    };
  }

  return {
    action: "NO_ACTION",
    reason: `Sentiment neutral (${score.toFixed(4)}). Next check in ${config.normalHarvestIntervalMinutes - elapsedMinutes} minutes.`,
  };
}

/**
 * For bearish sentiment: withdraw from lending to protect value.
 */
async function executeBearishWithdraw(
  tokenSymbol: string,
  client?: Client
): Promise<SwapResult> {
  try {
    const result = await withdrawFromBonzo(tokenSymbol, "0", true, client);
    return {
      attempted: true,
      executed: result.withdrawn,
      txId: result.txId,
      error: result.error,
    };
  } catch (error) {
    return {
      attempted: true,
      executed: false,
      txId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function executeHarvestCycle(config: HarvestConfig): Promise<HarvestDecision> {
  const withAudit = async (decision: HarvestDecision): Promise<HarvestDecision> => {
    await logHarvestDecision(config, decision, config.client);
    return decision;
  };

  const { sentiment } = await analyzeTokenSentiment({
    tokenSymbol: config.rewardTokenSymbol,
    lookbackHours: config.lookbackHours,
    maxItems: config.maxNewsItems,
  });

  const elapsedMinutes = minutesSinceLast(config.strategyAddress);
  const { action, reason } = decideHarvestAction(sentiment.score, config, elapsedMinutes);

  if (action === "NO_ACTION" || action === "DELAY_HARVEST") {
    return withAudit({
      action,
      reason,
      sentiment,
      harvestExecuted: false,
      harvestTxId: null,
      swap: { attempted: false, executed: false, txId: null, error: null },
      error: null,
      timeSinceLastHarvestMinutes: elapsedMinutes,
    });
  }

  try {
    setLastHarvestNow(config.strategyAddress);

    let swap: SwapResult = { attempted: false, executed: false, txId: null, error: null };

    if (action === "HARVEST_AND_SWAP_TO_USDC") {
      // Bearish: withdraw from lending to protect value
      swap = await executeBearishWithdraw(config.rewardTokenSymbol, config.client);
    }

    // For HARVEST_NOW in neutral sentiment, we just log the check — position stays
    return withAudit({
      action,
      reason,
      sentiment,
      harvestExecuted: true,
      harvestTxId: swap.txId,
      swap,
      error: swap.error,
      timeSinceLastHarvestMinutes: elapsedMinutes,
    });
  } catch (error) {
    return withAudit({
      action,
      reason,
      sentiment,
      harvestExecuted: false,
      harvestTxId: null,
      swap: { attempted: false, executed: false, txId: null, error: null },
      error: error instanceof Error ? error.message : "Unknown harvest error",
      timeSinceLastHarvestMinutes: elapsedMinutes,
    });
  }
}
