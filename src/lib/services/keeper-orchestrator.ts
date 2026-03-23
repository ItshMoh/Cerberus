import type { Client } from "@hashgraph/sdk";
import { CLM_VAULTS, getNetwork } from "@/lib/contracts/addresses";
import { executeRebalanceCycle, DEFAULT_STRATEGY_CONFIG } from "./rebalancer";
import {
  executeCircuitBreakerCycle,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./circuit-breaker";
import { executeHarvestCycle, DEFAULT_HARVEST_CONFIG } from "./harvester";
import { getClientForSession } from "./user-session";
import { listStrategyConfigs, type StoredStrategyConfig } from "./strategy-config";

export interface KeeperOrchestratorOptions {
  sessionToken?: string;
  vaultAddress?: string;
  strategyAddress?: string;
  enableVolatility?: boolean;
  enableDepeg?: boolean;
  enableHarvest?: boolean;
  intervals?: {
    volatilityMs?: number;
    depegMs?: number;
    harvestMs?: number;
  };
}

type KeeperState = {
  status: "running" | "stopped";
  startedAt: string | null;
  options: Required<KeeperOrchestratorOptions> & {
    vaultAddress: string;
    strategyAddress: string;
  };
  lastRunAt: {
    volatility: string | null;
    depeg: string | null;
    harvest: string | null;
  };
};

const loopHandles = new Map<string, { volatility?: NodeJS.Timeout; depeg?: NodeJS.Timeout; harvest?: NodeJS.Timeout }>();
const loopStates = new Map<string, KeeperState>();

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

function makeKey(sessionToken?: string): string {
  return sessionToken || "__global__";
}

function resolveClient(sessionToken?: string): Client | undefined {
  if (!sessionToken) return undefined;
  return getClientForSession(sessionToken);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Resolve the user's saved strategy config for a given vault.
 * Falls back to null if no matching config is found.
 */
function getUserStrategyConfig(
  sessionToken: string | undefined,
  vaultAddress: string
): StoredStrategyConfig | null {
  if (!sessionToken) return null;
  const configs = listStrategyConfigs(sessionToken);
  // Match by vault address (case-insensitive)
  return (
    configs.find(
      (c) => c.vaultAddress.toLowerCase() === vaultAddress.toLowerCase()
    ) || configs[0] || null
  );
}

export async function startKeeperOrchestrator(
  options: KeeperOrchestratorOptions = {}
): Promise<KeeperState> {
  const key = makeKey(options.sessionToken);
  stopKeeperOrchestrator(options.sessionToken);

  const defaultVault = getDefaultVault();
  const resolved = {
    sessionToken: options.sessionToken || "",
    vaultAddress: options.vaultAddress || defaultVault.vault,
    strategyAddress: options.strategyAddress || defaultVault.strategy,
    enableVolatility: options.enableVolatility ?? true,
    enableDepeg: options.enableDepeg ?? true,
    enableHarvest: options.enableHarvest ?? true,
    intervals: {
      volatilityMs: options.intervals?.volatilityMs ?? 60_000,
      depegMs: options.intervals?.depegMs ?? 30_000,
      harvestMs: options.intervals?.harvestMs ?? 4 * 60 * 60 * 1000,
    },
  };

  const state: KeeperState = {
    status: "running",
    startedAt: nowIso(),
    options: resolved,
    lastRunAt: {
      volatility: null,
      depeg: null,
      harvest: null,
    },
  };
  loopStates.set(key, state);

  const handles: { volatility?: NodeJS.Timeout; depeg?: NodeJS.Timeout; harvest?: NodeJS.Timeout } =
    {};

  const runVolatility = async () => {
    try {
      const client = resolveClient(resolved.sessionToken || undefined);
      const userConfig = getUserStrategyConfig(resolved.sessionToken || undefined, resolved.vaultAddress);
      await executeRebalanceCycle({
        vaultAddress: resolved.vaultAddress,
        strategyAddress: resolved.strategyAddress,
        client,
        ...DEFAULT_STRATEGY_CONFIG,
        // Override with user's saved config if available
        ...(userConfig?.volatility && {
          volatilityThreshold: userConfig.volatility.threshold,
          timeWindowMinutes: userConfig.volatility.timeWindowMinutes,
        }),
      });
      const s = loopStates.get(key);
      if (s) s.lastRunAt.volatility = nowIso();
    } catch (error) {
      console.error("[keeper-orchestrator] volatility cycle failed:", error);
    }
  };

  const runDepeg = async () => {
    try {
      const client = resolveClient(resolved.sessionToken || undefined);
      const userConfig = getUserStrategyConfig(resolved.sessionToken || undefined, resolved.vaultAddress);
      await executeCircuitBreakerCycle({
        vaultAddress: resolved.vaultAddress,
        strategyAddress: resolved.strategyAddress,
        client,
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
        // Override with user's saved config if available
        ...(userConfig?.depeg && {
          monitoredFeed: userConfig.depeg.monitoredFeed as "USDC/USD",
          warningThreshold: userConfig.depeg.warningThreshold,
          criticalThreshold: userConfig.depeg.criticalThreshold,
        }),
      });
      const s = loopStates.get(key);
      if (s) s.lastRunAt.depeg = nowIso();
    } catch (error) {
      console.error("[keeper-orchestrator] depeg cycle failed:", error);
    }
  };

  const runHarvest = async () => {
    try {
      const client = resolveClient(resolved.sessionToken || undefined);
      const userConfig = getUserStrategyConfig(resolved.sessionToken || undefined, resolved.vaultAddress);
      await executeHarvestCycle({
        vaultAddress: resolved.vaultAddress,
        strategyAddress: resolved.strategyAddress,
        client,
        ...DEFAULT_HARVEST_CONFIG,
        // Override with user's saved config if available
        ...(userConfig && {
          rewardTokenSymbol: userConfig.rewardTokenSymbol,
        }),
        ...(userConfig?.harvest && {
          bearishThreshold: userConfig.harvest.bearishThreshold,
          bullishThreshold: userConfig.harvest.bullishThreshold,
          normalHarvestIntervalMinutes: userConfig.harvest.intervalMinutes,
        }),
      });
      const s = loopStates.get(key);
      if (s) s.lastRunAt.harvest = nowIso();
    } catch (error) {
      console.error("[keeper-orchestrator] harvest cycle failed:", error);
    }
  };

  if (resolved.enableVolatility) {
    handles.volatility = setInterval(runVolatility, resolved.intervals.volatilityMs);
    void runVolatility();
  }
  if (resolved.enableDepeg) {
    handles.depeg = setInterval(runDepeg, resolved.intervals.depegMs);
    void runDepeg();
  }
  if (resolved.enableHarvest) {
    handles.harvest = setInterval(runHarvest, resolved.intervals.harvestMs);
    void runHarvest();
  }

  loopHandles.set(key, handles);
  return state;
}

export function stopKeeperOrchestrator(sessionToken?: string): KeeperState {
  const key = makeKey(sessionToken);
  const handles = loopHandles.get(key);
  if (handles?.volatility) clearInterval(handles.volatility);
  if (handles?.depeg) clearInterval(handles.depeg);
  if (handles?.harvest) clearInterval(handles.harvest);
  loopHandles.delete(key);

  const prev = loopStates.get(key);
  const state: KeeperState = prev
    ? { ...prev, status: "stopped" }
    : {
        status: "stopped",
        startedAt: null,
        options: {
          sessionToken: sessionToken || "",
          vaultAddress: "",
          strategyAddress: "",
          enableVolatility: false,
          enableDepeg: false,
          enableHarvest: false,
          intervals: {
            volatilityMs: 0,
            depegMs: 0,
            harvestMs: 0,
          },
        },
        lastRunAt: {
          volatility: null,
          depeg: null,
          harvest: null,
        },
      };
  loopStates.set(key, state);
  return state;
}

export function getKeeperOrchestratorStatus(sessionToken?: string): KeeperState {
  const key = makeKey(sessionToken);
  const state = loopStates.get(key);
  if (state) return state;
  return {
    status: "stopped",
    startedAt: null,
    options: {
      sessionToken: sessionToken || "",
      vaultAddress: "",
      strategyAddress: "",
      enableVolatility: false,
      enableDepeg: false,
      enableHarvest: false,
      intervals: {
        volatilityMs: 0,
        depegMs: 0,
        harvestMs: 0,
      },
    },
    lastRunAt: {
      volatility: null,
      depeg: null,
      harvest: null,
    },
  };
}

