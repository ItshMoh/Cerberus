import type { Client } from "@hashgraph/sdk";
import {
  assessVolatility,
  type FeedId,
  type VolatilityState,
} from "./volatility-monitor";
import { supplyToBonzo, withdrawFromBonzo } from "./lending-reader";
import { logRebalanceDecision } from "./hcs-logger";

export interface StrategyConfig {
  vaultAddress: string;
  strategyAddress: string;
  client?: Client;
  priceFeed: FeedId;
  // Volatility detection
  volatilityThreshold: number; // % price change to trigger (default: 3)
  timeWindowMinutes: number; // rolling window size (default: 20)
  // Lending position config
  supplyToken: string; // token to supply (default: HBAR)
  supplyAmount: string; // amount to supply/withdraw (default: "10")
  // Range widths kept for compatibility — now represent risk levels
  narrowWidth: number;
  wideWidth: number;
  // Cooldown
  cooldownMinutes: number; // min time between actions (default: 5)
  // Settle multiplier — volatility must stay below threshold for this * timeWindow
  settleMultiplier: number; // default: 2
}

export const DEFAULT_STRATEGY_CONFIG: Omit<StrategyConfig, "vaultAddress" | "strategyAddress"> = {
  priceFeed: "HBAR/USD",
  volatilityThreshold: 3,
  timeWindowMinutes: 20,
  supplyToken: "HBAR",
  supplyAmount: "10",
  narrowWidth: 100,
  wideWidth: 400,
  cooldownMinutes: 5,
  settleMultiplier: 2,
};

export type RebalanceAction = "SUPPLY_TO_LENDING" | "WITHDRAW_FROM_LENDING" | "NO_ACTION";

export interface RebalanceDecision {
  action: RebalanceAction;
  reason: string;
  volatility: VolatilityState;
  currentWidth: number;
  targetWidth: number | null;
  executed: boolean;
  transactionId: string | null;
  error: string | null;
}

// Track last action time per strategy to enforce cooldowns
const lastActionTime: Map<string, number> = new Map();

// Track current volatility regime per strategy
const currentRegime: Map<string, "HIGH" | "LOW" | "UNKNOWN"> = new Map();

// Track how long volatility has been below threshold
const calmSince: Map<string, number> = new Map();

/**
 * Core decision engine: should we supply or withdraw from lending?
 *
 * HIGH volatility → withdraw from lending (risk-off, hold tokens safe)
 * LOW volatility (settled) → supply to lending (risk-on, earn yield)
 */
export function decideAction(
  volatility: VolatilityState,
  config: StrategyConfig,
  currentRegimeState: "HIGH" | "LOW" | "UNKNOWN"
): { action: RebalanceAction; reason: string; targetWidth: number | null } {
  const now = Math.floor(Date.now() / 1000);
  const key = config.strategyAddress;

  // Check cooldown
  const lastAction = lastActionTime.get(key) || 0;
  const cooldownSeconds = config.cooldownMinutes * 60;
  if (now - lastAction < cooldownSeconds) {
    const remaining = cooldownSeconds - (now - lastAction);
    return {
      action: "NO_ACTION",
      reason: `Cooldown active — ${Math.ceil(remaining / 60)}min remaining`,
      targetWidth: null,
    };
  }

  // HIGH VOLATILITY → withdraw from lending (risk-off)
  if (volatility.isHighVolatility) {
    calmSince.delete(key);
    currentRegime.set(key, "HIGH");

    // Already in risk-off mode?
    if (currentRegimeState === "HIGH") {
      return {
        action: "NO_ACTION",
        reason: `High volatility detected (${volatility.priceDeltaPercent.toFixed(2)}% delta) but already in risk-off mode`,
        targetWidth: null,
      };
    }

    return {
      action: "WITHDRAW_FROM_LENDING",
      reason: `${volatility.priceDeltaPercent.toFixed(2)}% price delta in ${config.timeWindowMinutes}min exceeds ${config.volatilityThreshold}% threshold — withdrawing from Bonzo Lending for safety`,
      targetWidth: config.wideWidth,
    };
  }

  // LOW VOLATILITY — consider supplying to lending (risk-on)
  if (!calmSince.has(key)) {
    calmSince.set(key, now);
  }

  const calmDuration = now - (calmSince.get(key) || now);
  const settleTime = config.timeWindowMinutes * config.settleMultiplier * 60;

  if (calmDuration >= settleTime) {
    currentRegime.set(key, "LOW");

    // Already in risk-on mode?
    if (currentRegimeState === "LOW") {
      return {
        action: "NO_ACTION",
        reason: `Low volatility for ${Math.floor(calmDuration / 60)}min — already supplied to Bonzo Lending`,
        targetWidth: null,
      };
    }

    return {
      action: "SUPPLY_TO_LENDING",
      reason: `Volatility settled below ${config.volatilityThreshold}% for ${Math.floor(calmDuration / 60)}min — supplying ${config.supplyToken} to Bonzo Lending to earn yield`,
      targetWidth: config.narrowWidth,
    };
  }

  return {
    action: "NO_ACTION",
    reason: `Volatility below threshold (${volatility.priceDeltaPercent.toFixed(2)}%) — waiting for settle period (${Math.floor(calmDuration / 60)}/${Math.floor(settleTime / 60)}min)`,
    targetWidth: null,
  };
}

/**
 * Execute the full rebalance cycle: assess → decide → execute on Bonzo Lending
 */
export async function executeRebalanceCycle(
  config: StrategyConfig
): Promise<RebalanceDecision> {
  const withAudit = async (decision: RebalanceDecision): Promise<RebalanceDecision> => {
    await logRebalanceDecision(config, decision, config.client);
    return decision;
  };

  // 1. Assess current volatility
  const volatility = await assessVolatility(
    config.priceFeed,
    config.timeWindowMinutes,
    config.volatilityThreshold
  );

  // 2. Get current regime
  const regime = currentRegime.get(config.strategyAddress) || "UNKNOWN";
  const currentWidth = regime === "HIGH" ? config.wideWidth : config.narrowWidth;

  // 3. Decide action
  const { action, reason, targetWidth } = decideAction(volatility, config, regime);

  // 4. Execute if needed
  if (action === "NO_ACTION") {
    return withAudit({
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: false,
      transactionId: null,
      error: null,
    });
  }

  try {
    let txId: string | null = null;

    if (action === "SUPPLY_TO_LENDING") {
      const result = await supplyToBonzo(config.supplyToken, config.supplyAmount, config.client);
      if (result.error) throw new Error(result.error);
      txId = result.supplyTxId;
    } else if (action === "WITHDRAW_FROM_LENDING") {
      const result = await withdrawFromBonzo(config.supplyToken, config.supplyAmount, false, config.client);
      if (result.error) throw new Error(result.error);
      txId = result.txId;
    }

    lastActionTime.set(config.strategyAddress, Math.floor(Date.now() / 1000));
    calmSince.delete(config.strategyAddress);

    return withAudit({
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: true,
      transactionId: txId,
      error: null,
    });
  } catch (err) {
    return withAudit({
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: false,
      transactionId: null,
      error: err instanceof Error ? err.message : "Unknown execution error",
    });
  }
}

/**
 * Get the current regime for a strategy (for diagnostics)
 */
export function getCurrentRegime(strategyAddress: string): "HIGH" | "LOW" | "UNKNOWN" {
  return currentRegime.get(strategyAddress) || "UNKNOWN";
}

/**
 * Reset state for a strategy (for testing)
 */
export function resetStrategyState(strategyAddress: string): void {
  lastActionTime.delete(strategyAddress);
  currentRegime.delete(strategyAddress);
  calmSince.delete(strategyAddress);
}
