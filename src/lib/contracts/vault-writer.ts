import { ContractExecuteTransaction, ContractId, Hbar } from "@hashgraph/sdk";
import { ethers } from "ethers";
import { getHederaClient } from "../hedera-client";
import { CLM_STRATEGY_ABI, V7_STRATEGY_ABI } from "./abis";

function encodeFunction(abi: readonly string[], functionName: string, params: unknown[]) {
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(functionName, params);
  return Buffer.from(data.slice(2), "hex");
}

function evmToContractId(evmAddress: string): ContractId {
  return ContractId.fromEvmAddress(0, 0, evmAddress);
}

// --- CLM Strategy Keeper Operations ---

export async function harvest(strategyAddress: string) {
  const client = getHederaClient();
  const data = encodeFunction(CLM_STRATEGY_ABI, "harvest()", []);

  const tx = new ContractExecuteTransaction()
    .setContractId(evmToContractId(strategyAddress))
    .setGas(2_000_000)
    .setFunctionParameters(data)
    .setMaxTransactionFee(new Hbar(5));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    transactionId: response.transactionId.toString(),
    status: receipt.status.toString(),
  };
}

export async function moveTicks(strategyAddress: string) {
  const client = getHederaClient();
  const data = encodeFunction(CLM_STRATEGY_ABI, "moveTicks", []);

  const tx = new ContractExecuteTransaction()
    .setContractId(evmToContractId(strategyAddress))
    .setGas(2_000_000)
    .setFunctionParameters(data)
    .setMaxTransactionFee(new Hbar(5));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    transactionId: response.transactionId.toString(),
    status: receipt.status.toString(),
  };
}

export async function panic(
  strategyAddress: string,
  minAmount0: string = "0",
  minAmount1: string = "0"
) {
  const client = getHederaClient();
  const data = encodeFunction(CLM_STRATEGY_ABI, "panic", [
    minAmount0,
    minAmount1,
  ]);

  const tx = new ContractExecuteTransaction()
    .setContractId(evmToContractId(strategyAddress))
    .setGas(2_000_000)
    .setFunctionParameters(data)
    .setMaxTransactionFee(new Hbar(5));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    transactionId: response.transactionId.toString(),
    status: receipt.status.toString(),
  };
}

// --- V7 Strategy Keeper Operations ---

export async function harvestV7(strategyAddress: string) {
  const client = getHederaClient();
  const data = encodeFunction(V7_STRATEGY_ABI, "harvest", []);

  const tx = new ContractExecuteTransaction()
    .setContractId(evmToContractId(strategyAddress))
    .setGas(2_000_000)
    .setFunctionParameters(data)
    .setMaxTransactionFee(new Hbar(5));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    transactionId: response.transactionId.toString(),
    status: receipt.status.toString(),
  };
}

export async function panicV7(strategyAddress: string) {
  const client = getHederaClient();
  const data = encodeFunction(V7_STRATEGY_ABI, "panic", []);

  const tx = new ContractExecuteTransaction()
    .setContractId(evmToContractId(strategyAddress))
    .setGas(1_000_000)
    .setFunctionParameters(data)
    .setMaxTransactionFee(new Hbar(3));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    transactionId: response.transactionId.toString(),
    status: receipt.status.toString(),
  };
}
