import { Client, PrivateKey } from "@hashgraph/sdk";

export type HederaNetwork = "testnet" | "mainnet";
export type HederaCredentials = {
  accountId: string;
  privateKey: string;
  network?: HederaNetwork;
};

let clientInstance: Client | null = null;

export function getHederaNetwork(): HederaNetwork {
  return (process.env.NEXT_PUBLIC_NETWORK as HederaNetwork) || "testnet";
}

export function createHederaClient(credentials: HederaCredentials): Client {
  const network = credentials.network || getHederaNetwork();
  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(
    credentials.accountId,
    PrivateKey.fromStringECDSA(credentials.privateKey)
  );
  return client;
}

export function getHederaClient(): Client {
  if (clientInstance) return clientInstance;

  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorId || !operatorKey) {
    throw new Error(
      "HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env.local"
    );
  }

  clientInstance = createHederaClient({
    accountId: operatorId,
    privateKey: operatorKey,
    network: getHederaNetwork(),
  });
  return clientInstance;
}
