/**
 * One-time script to create an HCS audit topic and print the topic ID.
 * Run: npx tsx scripts/create-hcs-topic.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { Client, PrivateKey, TopicCreateTransaction } from "@hashgraph/sdk";

async function main() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    console.error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY must be set in .env.local");
    process.exit(1);
  }

  const client = Client.forTestnet();
  client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

  console.log("Creating HCS audit topic on testnet...");

  const tx = await new TopicCreateTransaction()
    .setTopicMemo("Bonzo Guardian Audit Log")
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId!.toString();

  console.log(`\nTopic created successfully!`);
  console.log(`Topic ID: ${topicId}`);
  console.log(`\nAdd this to your .env.local:`);
  console.log(`HCS_AUDIT_TOPIC_ID=${topicId}`);
}

main().catch(console.error);
