import { ethers } from "ethers";
import { CLM_VAULT_ABI, CLM_STRATEGY_ABI, V7_VAULT_ABI, ERC20_ABI } from "./abis";
import { getNetwork } from "./addresses";

function getProvider() {
  const network = getNetwork();
  const rpcUrl =
    network === "mainnet"
      ? "https://mainnet.hashio.io/api"
      : "https://testnet.hashio.io/api";
  return new ethers.JsonRpcProvider(rpcUrl);
}

// --- CLM Vault Read Operations ---

export async function getCLMVaultBalances(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  const [amount0, amount1] = await vault.balances();
  return { amount0: amount0.toString(), amount1: amount1.toString() };
}

export async function getCLMVaultTokens(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  const [token0, token1] = await vault.wants();
  return { token0, token1 };
}

export async function getCLMVaultPrice(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  const price = await vault.price();
  return price.toString();
}

export async function getCLMVaultIsCalm(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  return vault.isCalm();
}

export async function getCLMVaultPreviewWithdraw(
  vaultAddress: string,
  shares: string
) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  const [amount0, amount1] = await vault.previewWithdraw(shares);
  return { amount0: amount0.toString(), amount1: amount1.toString() };
}

export async function getCLMVaultUserShares(
  vaultAddress: string,
  userAddress: string
) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, CLM_VAULT_ABI, provider);
  const shares = await vault.balanceOf(userAddress);
  const totalSupply = await vault.totalSupply();
  return {
    shares: shares.toString(),
    totalSupply: totalSupply.toString(),
  };
}

// --- CLM Strategy Read Operations ---

export async function getStrategyPositionInfo(strategyAddress: string) {
  const provider = getProvider();
  const strategy = new ethers.Contract(
    strategyAddress,
    CLM_STRATEGY_ABI,
    provider
  );

  const [mainTickLower, mainTickUpper] = await strategy.positionMain();
  const [altTickLower, altTickUpper] = await strategy.positionAlt();
  const positionWidth = await strategy.positionWidth();

  return {
    main: {
      tickLower: Number(mainTickLower),
      tickUpper: Number(mainTickUpper),
    },
    alt: {
      tickLower: Number(altTickLower),
      tickUpper: Number(altTickUpper),
    },
    positionWidth: Number(positionWidth),
  };
}

export async function getStrategyBalances(strategyAddress: string) {
  const provider = getProvider();
  const strategy = new ethers.Contract(
    strategyAddress,
    CLM_STRATEGY_ABI,
    provider
  );
  const [token0Bal, token1Bal] = await strategy.balances();
  return { token0: token0Bal.toString(), token1: token1Bal.toString() };
}

export async function getStrategyIsCalm(strategyAddress: string) {
  const provider = getProvider();
  const strategy = new ethers.Contract(
    strategyAddress,
    CLM_STRATEGY_ABI,
    provider
  );
  return strategy.isCalm();
}

export async function getStrategyLastHarvest(strategyAddress: string) {
  const provider = getProvider();
  const strategy = new ethers.Contract(
    strategyAddress,
    CLM_STRATEGY_ABI,
    provider
  );
  const lastHarvest = await strategy.lastHarvest();
  return Number(lastHarvest);
}

export async function getStrategyStatus(strategyAddress: string) {
  const provider = getProvider();
  const strategy = new ethers.Contract(
    strategyAddress,
    CLM_STRATEGY_ABI,
    provider
  );
  const paused = await strategy.paused();
  return { paused };
}

// --- V7 Vault Read Operations ---

export async function getV7VaultBalance(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, V7_VAULT_ABI, provider);
  const balance = await vault.balance();
  return balance.toString();
}

export async function getV7VaultPricePerShare(vaultAddress: string) {
  const provider = getProvider();
  const vault = new ethers.Contract(vaultAddress, V7_VAULT_ABI, provider);
  const pps = await vault.getPricePerFullShare();
  return pps.toString();
}

// --- Token Read Operations ---

export async function getTokenInfo(tokenAddress: string) {
  const provider = getProvider();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [decimals, symbol] = await Promise.all([
    token.decimals(),
    token.symbol(),
  ]);
  return { decimals: Number(decimals), symbol };
}

export async function getTokenBalance(
  tokenAddress: string,
  accountAddress: string
) {
  const provider = getProvider();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const balance = await token.balanceOf(accountAddress);
  return balance.toString();
}
