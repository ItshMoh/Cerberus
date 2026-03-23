import { panic } from "../contracts/vault-writer";
import { getAgentToolkit } from "../agent-toolkit";
import { assessStablecoinPeg, type PegAlertLevel, type PegFeedId } from "./peg-monitor";

export interface CircuitBreakerConfig {
  vaultAddress: string;
  strategyAddress: string;
  monitoredFeed: PegFeedId;
  warningThreshold: number; // default 0.99
  criticalThreshold: number; // default 0.98
  // Safe lending destination config
  safeTokenSymbol: string; // e.g. HBAR/WHBAR
  safeDepositAmount: string; // human-readable token amount
  onBehalfOf?: string;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Omit<
  CircuitBreakerConfig,
  "vaultAddress" | "strategyAddress"
> = {
  monitoredFeed: "USDC/USD",
  warningThreshold: 0.99,
  criticalThreshold: 0.98,
  safeTokenSymbol: "HBAR",
  safeDepositAmount: "0",
};

export type CircuitBreakerAction =
  | "PANIC_AND_DEPOSIT"
  | "WARNING_ONLY"
  | "NO_ACTION";

export interface LendingActionResult {
  attempted: boolean;
  approved: boolean;
  deposited: boolean;
  approveResponse: string | null;
  depositResponse: string | null;
  error: string | null;
}

export interface CircuitBreakerDecision {
  action: CircuitBreakerAction;
  reason: string;
  monitoredFeed: PegFeedId;
  monitoredPrice: number;
  alertLevel: PegAlertLevel;
  panicExecuted: boolean;
  panicTransactionId: string | null;
  lendingAction: LendingActionResult;
  error: string | null;
}

type ExecutableTool = {
  execute: (args: unknown) => Promise<unknown>;
};

function isExecutableTool(tool: unknown): tool is ExecutableTool {
  if (!tool || typeof tool !== "object") return false;
  const candidate = tool as { execute?: unknown };
  return typeof candidate.execute === "function";
}

function parseTxId(raw: string | null): string | null {
  if (!raw) return null;
  const txRegex = /(\d+\.\d+\.\d+@\d+\.\d+)/;
  const match = raw.match(txRegex);
  return match ? match[1] : null;
}

function canDeposit(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}

async function executeBonzoSafeDeposit(
  tokenSymbol: string,
  amount: string,
  onBehalfOf?: string
): Promise<LendingActionResult> {
  if (!canDeposit(amount)) {
    return {
      attempted: false,
      approved: false,
      deposited: false,
      approveResponse: null,
      depositResponse: null,
      error: "safeDepositAmount is 0 or invalid; skipping Bonzo deposit",
    };
  }

  const toolkit = getAgentToolkit();
  const tools = toolkit.getTools();
  const approveTool = tools["approve_erc20_tool"];
  const depositTool = tools["bonzo_deposit_tool"];

  if (!isExecutableTool(approveTool) || !isExecutableTool(depositTool)) {
    return {
      attempted: true,
      approved: false,
      deposited: false,
      approveResponse: null,
      depositResponse: null,
      error: "Bonzo tools not available: approve_erc20_tool or bonzo_deposit_tool",
    };
  }

  try {
    const approveResponse = String(await approveTool.execute({
      required: {
        tokenSymbol,
        amount,
      },
      optional: {
        useMax: true,
      },
    }));

    const depositOptional = onBehalfOf
      ? {
          onBehalfOf,
          referralCode: 0,
        }
      : {
          referralCode: 0,
        };

    const depositResponse = String(await depositTool.execute({
      required: {
        tokenSymbol,
        amount,
      },
      optional: depositOptional,
    }));

    return {
      attempted: true,
      approved: true,
      deposited: true,
      approveResponse,
      depositResponse,
      error: null,
    };
  } catch (error) {
    return {
      attempted: true,
      approved: false,
      deposited: false,
      approveResponse: null,
      depositResponse: null,
      error: error instanceof Error ? error.message : "Unknown Bonzo deposit error",
    };
  }
}

export async function executeCircuitBreakerCycle(
  config: CircuitBreakerConfig
): Promise<CircuitBreakerDecision> {
  const peg = await assessStablecoinPeg({
    warningThreshold: config.warningThreshold,
    criticalThreshold: config.criticalThreshold,
    feeds: [config.monitoredFeed],
  });

  const monitored = peg.prices[0];
  const baseDecision = {
    monitoredFeed: config.monitoredFeed,
    monitoredPrice: monitored.price,
    alertLevel: monitored.alertLevel as PegAlertLevel,
  };

  if (monitored.alertLevel === "NORMAL") {
    return {
      action: "NO_ACTION",
      reason: `${config.monitoredFeed} at ${monitored.price.toFixed(6)} is within peg thresholds`,
      ...baseDecision,
      panicExecuted: false,
      panicTransactionId: null,
      lendingAction: {
        attempted: false,
        approved: false,
        deposited: false,
        approveResponse: null,
        depositResponse: null,
        error: null,
      },
      error: null,
    };
  }

  if (monitored.alertLevel === "WARNING") {
    return {
      action: "WARNING_ONLY",
      reason: `${config.monitoredFeed} warning: ${monitored.price.toFixed(6)} is below ${config.warningThreshold} but above critical threshold ${config.criticalThreshold}`,
      ...baseDecision,
      panicExecuted: false,
      panicTransactionId: null,
      lendingAction: {
        attempted: false,
        approved: false,
        deposited: false,
        approveResponse: null,
        depositResponse: null,
        error: null,
      },
      error: null,
    };
  }

  try {
    const panicResult = await panic(config.strategyAddress, "0", "0");
    const lendingAction = await executeBonzoSafeDeposit(
      config.safeTokenSymbol,
      config.safeDepositAmount,
      config.onBehalfOf
    );

    return {
      action: "PANIC_AND_DEPOSIT",
      reason: `${config.monitoredFeed} critical de-peg detected: ${monitored.price.toFixed(6)} < ${config.criticalThreshold}. Executed panic and safe deposit flow.`,
      ...baseDecision,
      panicExecuted: true,
      panicTransactionId: panicResult.transactionId || parseTxId(panicResult.status),
      lendingAction,
      error: lendingAction.error,
    };
  } catch (error) {
    return {
      action: "PANIC_AND_DEPOSIT",
      reason: `${config.monitoredFeed} critical de-peg detected: ${monitored.price.toFixed(6)} < ${config.criticalThreshold}. Panic execution failed.`,
      ...baseDecision,
      panicExecuted: false,
      panicTransactionId: null,
      lendingAction: {
        attempted: false,
        approved: false,
        deposited: false,
        approveResponse: null,
        depositResponse: null,
        error: null,
      },
      error: error instanceof Error ? error.message : "Unknown panic execution error",
    };
  }
}
