// Contract addresses for Hedera testnet and mainnet

export type Network = "testnet" | "mainnet";

// CLM Vault deployments (Bonzo Vaults - Beefy fork)
// These are the concentrated liquidity vaults on SaucerSwap
export const CLM_VAULTS = {
  testnet: {
    "CLXY-SAUCE": {
      vault: "0x88b88B54294B2EFD97D5f3604167257975FCeC6B",
      strategy: "0xB5a7AA681676480Df4D36809015d93118Cc2de1A",
      pool: "0x1a6ca726e07a11849176b3c3b8e2ceda7553b9aa",
      token0: "0x00000000000000000000000000000000000014f5", // CLXY
      token1: "0x0000000000000000000000000000000000120f46", // SAUCE
      positionWidth: 200,
    },
  },
  mainnet: {
    // Mainnet vault addresses from Bonzo docs
  },
} as const;

// V7 Vault deployments (single-asset)
export const V7_VAULTS = {
  testnet: {},
  mainnet: {},
} as const;

// Infrastructure
export const INFRASTRUCTURE = {
  testnet: {
    lendingPool: "0x7710a96b01e02eD00768C3b39BfA7B4f1c128c62",
    vaultFactory: "",
    beefyOracle: "",
  },
  mainnet: {
    lendingPool: "0x236897c518996163E7b313aD21D1C9fCC7BA1afc",
    vaultFactory: "0x09bdD9F87c5c7A04f06F94EC03a02CFED880Ef5e",
    beefyOracle: "0x41Dba9095d0B546E4cAD73FE0F4dc6B652cd39B1",
  },
} as const;

// Token addresses
export const TOKENS = {
  testnet: {
    WHBAR: "0x0000000000000000000000000000000000003ad2",
    USDC: "0x0000000000000000000000000000000000001549",
    HBARX: "0x0000000000000000000000000000000000220ced",
    SAUCE: "0x0000000000000000000000000000000000120f46",
    XSAUCE: "0x000000000000000000000000000000000015a59b",
    KARATE: "0x00000000000000000000000000000000001647a8",
  },
  mainnet: {
    WHBAR: "0x0000000000000000000000000000000000163B5a",
    USDC: "0x000000000000000000000000000000000006f89a",
    HBARX: "0x00000000000000000000000000000000000cba44",
    SAUCE: "0x00000000000000000000000000000000000b2ad5",
    XSAUCE: "0x00000000000000000000000000000000000e93e5",
    KARATE: "0x000000000000000000000000000000000022d6de",
    BONZO: "0x00000000000000000000000000000000007e545e",
  },
} as const;

export function getNetwork(): Network {
  return (process.env.NEXT_PUBLIC_NETWORK as Network) || "testnet";
}
