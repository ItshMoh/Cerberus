import { Client, PrivateKey } from "@hashgraph/sdk";

let clientInstance: Client | null = null;

export function getHederaClient(): Client {
  if (clientInstance) return clientInstance;

  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      "HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env.local"
    );
  }

  const network = process.env.NEXT_PUBLIC_NETWORK || "testnet";

  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

  clientInstance = client;
  return client;
}
