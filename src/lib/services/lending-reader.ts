/**
 * Read Bonzo Lending positions using the bonzo_market_data_tool.
 * This replaces vault-reader for the lending-based keeper.
 */
import type { Client } from "@hashgraph/sdk";
import { getAgentToolkit } from "../agent-toolkit";

type ExecutableTool = {
  execute: (args: unknown, options: unknown) => Promise<unknown>;
};

function isExecutableTool(tool: unknown): tool is ExecutableTool {
  if (!tool || typeof tool !== "object") return false;
  return typeof (tool as { execute?: unknown }).execute === "function";
}

export interface LendingMarketData {
  raw: string;
  available: boolean;
}

export interface LendingPosition {
  supplied: boolean;
  supplyTxId: string | null;
  error: string | null;
}

/**
 * Fetch Bonzo lending market data (APYs, liquidity, utilization).
 */
export async function getBonzoMarketData(client?: Client): Promise<LendingMarketData> {
  try {
    const toolkit = getAgentToolkit(client);
    const tools = toolkit.getTools();
    const marketTool = tools["bonzo_market_data_tool"];

    if (!isExecutableTool(marketTool)) {
      return { raw: "bonzo_market_data_tool not available", available: false };
    }

    const result = String(await marketTool.execute({}, {}));
    return { raw: result, available: true };
  } catch (error) {
    return {
      raw: error instanceof Error ? error.message : "Unknown error",
      available: false,
    };
  }
}

/**
 * Supply tokens to Bonzo Lending.
 */
export async function supplyToBonzo(
  tokenSymbol: string,
  amount: string,
  client?: Client
): Promise<LendingPosition> {
  try {
    const toolkit = getAgentToolkit(client);
    const tools = toolkit.getTools();
    const approveTool = tools["approve_erc20_tool"];
    const depositTool = tools["bonzo_deposit_tool"];

    if (!isExecutableTool(approveTool) || !isExecutableTool(depositTool)) {
      return { supplied: false, supplyTxId: null, error: "Bonzo lending tools not available" };
    }

    // Approve
    await approveTool.execute(
      { required: { tokenSymbol, amount }, optional: { useMax: true } },
      {}
    );

    // Deposit / Supply
    const result = String(
      await depositTool.execute(
        { required: { tokenSymbol, amount }, optional: { referralCode: 0 } },
        {}
      )
    );

    const txMatch = result.match(/(\d+\.\d+\.\d+@\d+\.\d+)/);
    return { supplied: true, supplyTxId: txMatch ? txMatch[1] : null, error: null };
  } catch (error) {
    return {
      supplied: false,
      supplyTxId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Withdraw tokens from Bonzo Lending.
 */
export async function withdrawFromBonzo(
  tokenSymbol: string,
  amount: string,
  withdrawAll = false,
  client?: Client
): Promise<{ withdrawn: boolean; txId: string | null; error: string | null }> {
  try {
    const toolkit = getAgentToolkit(client);
    const tools = toolkit.getTools();
    const withdrawTool = tools["bonzo_withdraw_tool"];

    if (!isExecutableTool(withdrawTool)) {
      return { withdrawn: false, txId: null, error: "bonzo_withdraw_tool not available" };
    }

    const result = String(
      await withdrawTool.execute(
        {
          required: { tokenSymbol, amount },
          optional: { withdrawAll },
        },
        {}
      )
    );

    const txMatch = result.match(/(\d+\.\d+\.\d+@\d+\.\d+)/);
    return { withdrawn: true, txId: txMatch ? txMatch[1] : null, error: null };
  } catch (error) {
    return {
      withdrawn: false,
      txId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
