import axios from "axios";
import type { Client } from "@hashgraph/sdk";
import { getAgentToolkit } from "../agent-toolkit";
import { getNetwork } from "../contracts/addresses";
import type { StrategyConfig, RebalanceDecision } from "./rebalancer";
import type { CircuitBreakerConfig, CircuitBreakerDecision } from "./circuit-breaker";
import type { HarvestConfig, HarvestDecision } from "./harvester";

export type AuditAction =
  | "SUPPLY_TO_LENDING"
  | "WITHDRAW_FROM_LENDING"
  | "WIDEN_RANGE"
  | "TIGHTEN_RANGE"
  | "NO_REBALANCE_ACTION"
  | "DEPEG_WARNING"
  | "DEPEG_EMERGENCY_EXIT"
  | "DEPEG_NO_ACTION"
  | "HARVEST_NOW"
  | "HARVEST_DELAY"
  | "HARVEST_AND_SWAP_TO_USDC"
  | "HARVEST_NO_ACTION";

export interface AuditLogEvent {
  timestamp: string;
  service: "rebalancer" | "circuit-breaker" | "harvester";
  vault: string;
  strategy: string;
  action: AuditAction;
  reason: string;
  params: Record<string, unknown>;
  txId: string | null;
}

export interface AuditLogQuery {
  topicId?: string;
  limit?: number;
  vault?: string;
  action?: string;
}

export interface AuditLogRecord {
  consensusTimestamp: string;
  sequenceNumber: number;
  topicId: string;
  payerAccountId?: string;
  rawMessage: string;
  parsed: AuditLogEvent | null;
}

let cachedTopicId: string | null = null;

const DEFAULT_TOPIC_MEMO = "Bonzo Guardian Audit Log";

type ExecutableTool = {
  execute: (input: unknown, options: unknown) => Promise<unknown>;
};

function parseMaybeJson<T>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function extractTopicId(raw: unknown): string | null {
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  const match = str.match(/\b\d+\.\d+\.\d+\b/);
  return match ? match[0] : null;
}

function extractTxId(raw: unknown): string | null {
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  const match = str.match(/\b\d+\.\d+\.\d+@\d+\.\d+\b/);
  return match ? match[0] : null;
}

function getMirrorNodeBaseUrl(): string {
  const fromEnv = process.env.HEDERA_MIRROR_NODE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const network = getNetwork();
  return network === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com/api/v1"
    : "https://testnet.mirrornode.hedera.com/api/v1";
}

async function ensureAuditTopicId(client?: Client): Promise<string> {
  if (cachedTopicId) return cachedTopicId;

  const fromEnv = process.env.HCS_AUDIT_TOPIC_ID;
  if (fromEnv) {
    cachedTopicId = fromEnv;
    return fromEnv;
  }

  const autoCreate = process.env.HCS_AUTO_CREATE_TOPIC !== "false";
  if (!autoCreate) {
    throw new Error("HCS_AUDIT_TOPIC_ID is required when HCS_AUTO_CREATE_TOPIC=false");
  }

  const toolkit = getAgentToolkit(client);
  const tools = toolkit.getTools();
  const createTopicTool = tools["create_topic_tool"] as unknown as ExecutableTool | undefined;
  if (!createTopicTool || typeof createTopicTool.execute !== "function") {
    throw new Error("create_topic_tool is not available in Hedera toolkit");
  }

  const raw = await createTopicTool.execute(
    {
      topicMemo: process.env.HCS_AUDIT_TOPIC_MEMO || DEFAULT_TOPIC_MEMO,
      isSubmitKey: false,
    },
    {}
  );

  const parsed = parseMaybeJson<Record<string, unknown>>(String(raw));
  const topicId =
    extractTopicId(parsed?.topicId) ||
    extractTopicId(parsed?.raw) ||
    extractTopicId(parsed?.humanMessage) ||
    extractTopicId(raw);

  if (!topicId) {
    throw new Error(`Failed to create HCS topic. Response: ${String(raw)}`);
  }

  cachedTopicId = topicId;
  return topicId;
}

export async function logAuditEvent(event: AuditLogEvent, client?: Client): Promise<{
  topicId: string;
  txId: string | null;
}> {
  const topicId = await ensureAuditTopicId(client);

  const toolkit = getAgentToolkit(client);
  const tools = toolkit.getTools();
  const submitTool = tools["submit_topic_message_tool"] as unknown as
    | ExecutableTool
    | undefined;
  if (!submitTool || typeof submitTool.execute !== "function") {
    throw new Error("submit_topic_message_tool is not available in Hedera toolkit");
  }

  const message = JSON.stringify(event);
  const raw = await submitTool.execute(
    {
      topicId,
      message,
      transactionMemo: "BonzoGuardianAudit",
    },
    {}
  );

  const parsed = parseMaybeJson<Record<string, unknown>>(String(raw));
  const txId = extractTxId(parsed?.transactionId) || extractTxId(parsed?.raw) || extractTxId(raw);
  return { topicId, txId };
}

export async function safeLogAuditEvent(event: AuditLogEvent, client?: Client): Promise<void> {
  try {
    await logAuditEvent(event, client);
  } catch (error) {
    console.error("[hcs-logger] failed to log audit event:", error);
  }
}

export async function getAuditLogs(query: AuditLogQuery = {}): Promise<{
  topicId: string;
  logs: AuditLogRecord[];
}> {
  const topicId = query.topicId || (await ensureAuditTopicId());
  const limit =
    query.limit ??
    (process.env.HCS_AUDIT_MAX_MESSAGES
      ? Number(process.env.HCS_AUDIT_MAX_MESSAGES)
      : 50);

  const mirrorUrl = `${getMirrorNodeBaseUrl()}/topics/${topicId}/messages`;
  const response = await axios.get(mirrorUrl, {
    params: {
      limit: Math.max(1, Math.min(limit, 200)),
      order: "desc",
    },
    timeout: 10_000,
  });

  const rows = (response.data?.messages as Array<Record<string, unknown>>) || [];
  let records: AuditLogRecord[] = rows.map((row) => {
    const rawMessage = Buffer.from(String(row.message || ""), "base64").toString("utf8");
    const parsed = parseMaybeJson<AuditLogEvent>(rawMessage);
    return {
      consensusTimestamp: String(row.consensus_timestamp || ""),
      sequenceNumber: Number(row.sequence_number || 0),
      topicId: String(row.topic_id || topicId),
      payerAccountId: row.payer_account_id ? String(row.payer_account_id) : undefined,
      rawMessage,
      parsed,
    };
  });

  if (query.vault) {
    records = records.filter((r) => r.parsed?.vault === query.vault);
  }
  if (query.action) {
    records = records.filter((r) => r.parsed?.action === query.action);
  }

  return { topicId, logs: records };
}

export async function logRebalanceDecision(
  config: StrategyConfig,
  decision: RebalanceDecision,
  client?: Client
): Promise<void> {
  await safeLogAuditEvent({
    timestamp: new Date().toISOString(),
    service: "rebalancer",
    vault: config.vaultAddress,
    strategy: config.strategyAddress,
    action:
      decision.action === "NO_ACTION"
        ? "NO_REBALANCE_ACTION"
        : decision.action === "SUPPLY_TO_LENDING"
          ? "SUPPLY_TO_LENDING"
          : decision.action === "WITHDRAW_FROM_LENDING"
            ? "WITHDRAW_FROM_LENDING"
            : (decision.action as "WIDEN_RANGE" | "TIGHTEN_RANGE"),
    reason: decision.reason,
    params: {
      currentWidth: decision.currentWidth,
      targetWidth: decision.targetWidth,
      executed: decision.executed,
      volatility: {
        priceDeltaPercent: decision.volatility.priceDeltaPercent,
        realizedVolatility: decision.volatility.realizedVolatility,
        threshold: decision.volatility.threshold,
        windowMinutes: decision.volatility.windowMinutes,
      },
      error: decision.error,
    },
    txId: decision.transactionId,
  }, client);
}

export async function logCircuitBreakerDecision(
  config: CircuitBreakerConfig,
  decision: CircuitBreakerDecision,
  client?: Client
): Promise<void> {
  const mappedAction: AuditAction =
    decision.action === "WARNING_ONLY"
      ? "DEPEG_WARNING"
      : decision.action === "PANIC_AND_DEPOSIT"
        ? "DEPEG_EMERGENCY_EXIT"
        : "DEPEG_NO_ACTION";

  await safeLogAuditEvent({
    timestamp: new Date().toISOString(),
    service: "circuit-breaker",
    vault: config.vaultAddress,
    strategy: config.strategyAddress,
    action: mappedAction,
    reason: decision.reason,
    params: {
      monitoredFeed: decision.monitoredFeed,
      monitoredPrice: decision.monitoredPrice,
      alertLevel: decision.alertLevel,
      panicExecuted: decision.panicExecuted,
      lendingAction: decision.lendingAction,
      error: decision.error,
    },
    txId: decision.panicTransactionId,
  }, client);
}

export async function logHarvestDecision(
  config: HarvestConfig,
  decision: HarvestDecision,
  client?: Client
): Promise<void> {
  const mappedAction: AuditAction =
    decision.action === "HARVEST_AND_SWAP_TO_USDC"
      ? "HARVEST_AND_SWAP_TO_USDC"
      : decision.action === "HARVEST_NOW"
        ? "HARVEST_NOW"
        : decision.action === "DELAY_HARVEST"
          ? "HARVEST_DELAY"
          : "HARVEST_NO_ACTION";

  await safeLogAuditEvent({
    timestamp: new Date().toISOString(),
    service: "harvester",
    vault: config.vaultAddress,
    strategy: config.strategyAddress,
    action: mappedAction,
    reason: decision.reason,
    params: {
      rewardToken: config.rewardTokenSymbol,
      sentiment: {
        score: decision.sentiment.score,
        label: decision.sentiment.label,
        confidence: decision.sentiment.confidence,
        sourceCount: decision.sentiment.sourceCount,
      },
      harvestExecuted: decision.harvestExecuted,
      swap: decision.swap,
      error: decision.error,
    },
    txId: decision.harvestTxId,
  }, client);
}
