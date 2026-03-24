import { streamText, tool } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { INFRASTRUCTURE, getNetwork } from "@/lib/contracts/addresses";
import { getKeeperTools } from "@/lib/services/keeper-tools";
import { getAuditLogs } from "@/lib/services/hcs-logger";
import { analyzeTokenSentiment } from "@/lib/services/sentiment";
import { getBonzoMarketData } from "@/lib/services/lending-reader";
import {
  getClientForSession,
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

function getDefaultLendingPool() {
  const network = getNetwork();
  return INFRASTRUCTURE[network].lendingPool;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const lendingPool = getDefaultLendingPool();
    const sessionToken =
      resolveSessionTokenFromRequest(request) || body?.sessionToken || undefined;
    const sessionInfo = sessionToken ? getSessionInfo(sessionToken) : null;
    const userClient = sessionToken && sessionInfo ? getClientForSession(sessionToken) : undefined;

    const provider = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || "",
    });
    const model = provider(process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini");

    const [marketData, audit, sentiment] = await Promise.all([
      getBonzoMarketData(userClient),
      getAuditLogs({ limit: 5 }),
      analyzeTokenSentiment({ tokenSymbol: "SAUCE", maxItems: 10, lookbackHours: 24 }),
    ]);

    const systemPrompt = [
      "You are Bonzo Guardian assistant.",
      "Answer with concise, practical explanations about keeper actions.",
      `Network: ${getNetwork()}`,
      `Session connected: ${sessionInfo ? "yes" : "no"}`,
      `Connected account: ${sessionInfo?.accountId || "none"}`,
      `Bonzo Lending Pool: ${lendingPool}`,
      `Market data available: ${marketData.available ? "yes" : "no"}`,
      `Latest sentiment SAUCE: ${sentiment.sentiment.score} (${sentiment.sentiment.label})`,
      `Recent audit log entries: ${audit.logs.length}`,
      "If a tool returns an error, explain the likely cause and next action clearly.",
    ].join("\n");

    const keeperTools = getKeeperTools();

    const customTools = {
      get_vault_status: tool({
        description:
          "Fetch current Bonzo Lending status (legacy tool name kept for compatibility).",
        inputSchema: z.object({}),
        execute: async () => {
          const md = await getBonzoMarketData(userClient);
          return {
            type: "bonzo-lending",
            network: getNetwork(),
            lendingPool,
            marketData: md.raw,
            available: md.available,
          };
        },
      }),
      get_market_data: tool({
        description: "Fetch Bonzo market data through bonzo_market_data_tool.",
        inputSchema: z.object({}),
        execute: async () => {
          const md = await getBonzoMarketData(userClient);
          return {
            type: "bonzo-lending",
            lendingPool,
            marketData: md.raw,
            available: md.available,
          };
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
