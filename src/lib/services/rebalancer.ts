import {
  assessVolatility,
  type FeedId,
  type VolatilityState,
} from "./volatility-monitor";
import { getStrategyIsCalm, getStrategyPositionInfo } from "../contracts/vault-reader";
import { moveTicks } from "../contracts/vault-writer";

export interface StrategyConfig {
  vaultAddress: string;
  strategyAddress: string;
  priceFeed: FeedId;
  // Volatility detection
  volatilityThreshold: number; // % price change to trigger (default: 3)
  timeWindowMinutes: number; // rolling window size (default: 20)
  // Range widths (tick spacing multipliers)
  narrowWidth: number; // width for calm markets (e.g., 100)
  wideWidth: number; // width for volatile markets (e.g., 400)
  // Cooldown
  cooldownMinutes: number; // min time between actions (default: 5)
  // Settle multiplier — volatility must stay below threshold for this * timeWindow
  settleMultiplier: number; // default: 2
}

export const DEFAULT_STRATEGY_CONFIG: Omit<StrategyConfig, "vaultAddress" | "strategyAddress"> = {
  priceFeed: "HBAR/USD",
  volatilityThreshold: 3,
  timeWindowMinutes: 20,
  narrowWidth: 100,
  wideWidth: 400,
  cooldownMinutes: 5,
  settleMultiplier: 2,
};

export type RebalanceAction = "WIDEN_RANGE" | "TIGHTEN_RANGE" | "NO_ACTION";

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
 * Core decision engine: should we widen or tighten the range?
 */
export function decideAction(
  volatility: VolatilityState,
  config: StrategyConfig,
  currentWidth: number
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

  // HIGH VOLATILITY — need to widen
  if (volatility.isHighVolatility) {
    // Reset calm tracker
    calmSince.delete(key);

    currentRegime.set(key, "HIGH");

    // Already wide?
    if (currentWidth >= config.wideWidth) {
      return {
        action: "NO_ACTION",
        reason: `High volatility detected (${volatility.priceDeltaPercent.toFixed(2)}% delta) but range already wide (${currentWidth})`,
        targetWidth: null,
      };
    }

    return {
      action: "WIDEN_RANGE",
      reason: `${volatility.priceDeltaPercent.toFixed(2)}% price delta in ${config.timeWindowMinutes}min window exceeds ${config.volatilityThreshold}% threshold — widening range for protection`,
      targetWidth: config.wideWidth,
    };
  }

  // LOW VOLATILITY — consider tightening
  // Track how long volatility has been below threshold
  if (!calmSince.has(key)) {
    calmSince.set(key, now);
  }

  const calmDuration = now - (calmSince.get(key) || now);
  const settleTime = config.timeWindowMinutes * config.settleMultiplier * 60;

  if (calmDuration >= settleTime) {
    currentRegime.set(key, "LOW");

    // Already narrow?
    if (currentWidth <= config.narrowWidth) {
      return {
        action: "NO_ACTION",
        reason: `Low volatility for ${Math.floor(calmDuration / 60)}min — range already narrow (${currentWidth})`,
        targetWidth: null,
      };
    }

    return {
      action: "TIGHTEN_RANGE",
      reason: `Volatility settled below ${config.volatilityThreshold}% for ${Math.floor(calmDuration / 60)}min (${config.settleMultiplier}x window) — tightening range to maximize fees`,
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
 * Execute the full rebalance cycle: assess → decide → execute
 */
export async function executeRebalanceCycle(
  config: StrategyConfig
): Promise<RebalanceDecision> {
  // 1. Assess current volatility
  const volatility = await assessVolatility(
    config.priceFeed,
    config.timeWindowMinutes,
    config.volatilityThreshold
  );

  // 2. Get current position width from strategy
  const positionInfo = await getStrategyPositionInfo(config.strategyAddress);
  const currentWidth = positionInfo.positionWidth;

  // 3. Decide action
  const { action, reason, targetWidth } = decideAction(volatility, config, currentWidth);

  // 4. Execute if needed
  if (action === "NO_ACTION") {
    return {
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: false,
      transactionId: null,
      error: null,
    };
  }

  // Check TWAP calm before executing
  const isCalm = await getStrategyIsCalm(config.strategyAddress);
  if (!isCalm) {
    return {
      action,
      reason: `${reason} — BUT isCalm() is false (TWAP safety check failed), skipping execution`,
      volatility,
      currentWidth,
      targetWidth,
      executed: false,
      transactionId: null,
      error: "TWAP calm check failed — price too far from TWAP, unsafe to rebalance",
    };
  }

  // Execute moveTicks to rebalance
  try {
    const result = await moveTicks(config.strategyAddress);
    lastActionTime.set(config.strategyAddress, Math.floor(Date.now() / 1000));

    // Reset calm tracker after any action
    if (action === "WIDEN_RANGE") {
      calmSince.delete(config.strategyAddress);
    }
    if (action === "TIGHTEN_RANGE") {
      calmSince.delete(config.strategyAddress);
    }

    return {
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: true,
      transactionId: result.transactionId,
      error: null,
    };
  } catch (err) {
    return {
      action,
      reason,
      volatility,
      currentWidth,
      targetWidth,
      executed: false,
      transactionId: null,
      error: err instanceof Error ? err.message : "Unknown execution error",
    };
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
