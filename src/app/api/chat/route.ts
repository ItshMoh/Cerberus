import { streamText, tool } from "ai";
import { z } from "zod";
import axios from "axios";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { CLM_VAULTS, getNetwork } from "@/lib/contracts/addresses";
import {
  getStrategyBalances,
  getStrategyIsCalm,
  getStrategyLastHarvest,
  getStrategyPositionInfo,
} from "@/lib/contracts/vault-reader";
import { getKeeperTools } from "@/lib/services/keeper-tools";
import { getAuditLogs } from "@/lib/services/hcs-logger";
import { analyzeTokenSentiment } from "@/lib/services/sentiment";
import {
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const defaultVault = getDefaultVault();
    const sessionToken =
      resolveSessionTokenFromRequest(request) || body?.sessionToken || undefined;
    const sessionInfo = sessionToken ? getSessionInfo(sessionToken) : null;

    const provider = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || "",
    });
    const model = provider(process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini");

    const [positionInfo, balances, isCalm, lastHarvest, audit, sentiment] =
      await Promise.all([
        getStrategyPositionInfo(defaultVault.strategy),
        getStrategyBalances(defaultVault.strategy),
        getStrategyIsCalm(defaultVault.strategy),
        getStrategyLastHarvest(defaultVault.strategy),
        getAuditLogs({ limit: 5 }),
        analyzeTokenSentiment({ tokenSymbol: "SAUCE", maxItems: 10, lookbackHours: 24 }),
      ]);

    const systemPrompt = [
      "You are Bonzo Guardian assistant.",
      "Answer with concise, practical explanations about keeper actions.",
      `Network: ${getNetwork()}`,
      `Session connected: ${sessionInfo ? "yes" : "no"}`,
      `Connected account: ${sessionInfo?.accountId || "none"}`,
      `Vault: ${defaultVault.vault}`,
      `Strategy: ${defaultVault.strategy}`,
      `Current position width: ${positionInfo.positionWidth}`,
      `Balances token0/token1: ${balances.token0}/${balances.token1}`,
      `isCalm: ${isCalm}`,
      `Last harvest timestamp: ${lastHarvest}`,
      `Latest sentiment SAUCE: ${sentiment.sentiment.score} (${sentiment.sentiment.label})`,
      `Recent audit log entries: ${audit.logs.length}`,
      "If a tool returns an error, explain the likely cause and next action clearly.",
    ].join("\n");

    const keeperTools = getKeeperTools();

    const customTools = {
      get_vault_status: tool({
        description: "Fetch current on-chain vault strategy status.",
        inputSchema: z.object({}),
        execute: async () => {
          const [p, b, calm, lh] = await Promise.all([
            getStrategyPositionInfo(defaultVault.strategy),
            getStrategyBalances(defaultVault.strategy),
            getStrategyIsCalm(defaultVault.strategy),
            getStrategyLastHarvest(defaultVault.strategy),
          ]);
          return {
            vault: defaultVault.vault,
            strategy: defaultVault.strategy,
            positionInfo: p,
            balances: b,
            isCalm: calm,
            lastHarvest: lh,
          };
        },
      }),
      get_market_data: tool({
        description: "Fetch Bonzo market data through bonzo_market_data_tool.",
        inputSchema: z.object({}),
        execute: async () => {
          const response = await axios.get(
            "https://mainnet-data-staging.bonzo.finance/market",
            { timeout: 10_000 }
          );
          return response.data;
        },
      }),
      get_audit_log: tool({
        description: "Get recent HCS audit log records.",
        inputSchema: z.object({
          limit: z.number().min(1).max(100).default(10),
        }),
        execute: async ({ limit }) => {
          const logs = await getAuditLogs({ limit });
          return logs;
        },
      }),
      get_sentiment_snapshot: tool({
        description: "Get token sentiment snapshot from LunarCrush + LLM.",
        inputSchema: z.object({
          token: z.string().default("SAUCE"),
        }),
        execute: async ({ token }) => {
          return analyzeTokenSentiment({
            tokenSymbol: token,
            lookbackHours: 24,
            maxItems: 20,
          });
        },
      }),
      explain_last_action: tool({
        description: "Explain the latest keeper action from audit logs.",
        inputSchema: z.object({}),
        execute: async () => {
          const logs = await getAuditLogs({ limit: 1 });
          const latest = logs.logs[0];
          if (!latest || !latest.parsed) {
            return { explanation: "No audit actions logged yet." };
          }
          return {
            latestAction: latest.parsed.action,
            reason: latest.parsed.reason,
            timestamp: latest.parsed.timestamp,
            txId: latest.parsed.txId,
            params: latest.parsed.params,
          };
        },
      }),
    };

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools: {
        ...customTools,
        ...keeperTools,
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
