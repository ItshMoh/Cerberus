import { NextResponse } from "next/server";
import {
  getCLMVaultBalances,
  getCLMVaultIsCalm,
  getCLMVaultPrice,
  getStrategyPositionInfo,
  getStrategyStatus,
  getStrategyLastHarvest,
} from "@/lib/contracts/vault-reader";
import { CLM_VAULTS } from "@/lib/contracts/addresses";

export async function GET() {
  const vault = CLM_VAULTS.testnet["CLXY-SAUCE"];

  try {
    const [balances, isCalm, price, positionInfo, status, lastHarvest] =
      await Promise.allSettled([
        getCLMVaultBalances(vault.vault),
        getCLMVaultIsCalm(vault.vault),
        getCLMVaultPrice(vault.vault),
        getStrategyPositionInfo(vault.strategy),
        getStrategyStatus(vault.strategy),
        getStrategyLastHarvest(vault.strategy),
      ]);

    const formatResult = (r: PromiseSettledResult<unknown>) =>
      r.status === "fulfilled"
        ? r.value
        : { error: String(r.reason) };

    return NextResponse.json({
      ok: true,
      vault: vault.vault,
      strategy: vault.strategy,
      balances: formatResult(balances),
      isCalm: formatResult(isCalm),
      price: formatResult(price),
      positionInfo: formatResult(positionInfo),
      status: formatResult(status),
      lastHarvest: formatResult(lastHarvest),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
