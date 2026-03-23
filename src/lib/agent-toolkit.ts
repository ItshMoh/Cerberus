import {
  HederaAIToolkit,
  AgentMode,
  type Configuration,
  type Context,
  coreAccountPlugin,
  coreAccountQueryPlugin,
  coreConsensusPlugin,
  coreConsensusQueryPlugin,
  coreTokenPlugin,
  coreTokenQueryPlugin,
  coreMiscQueriesPlugin,
} from "hedera-agent-kit";
import { bonzoPlugin } from "@bonzofinancelabs/hak-bonzo-plugin";
import type { Client } from "@hashgraph/sdk";
import { getHederaClient } from "./hedera-client";

let toolkitInstance: HederaAIToolkit | null = null;

export function createAgentToolkit(client: Client, context?: Context): HederaAIToolkit {
  const configuration: Configuration = {
    plugins: [
      coreAccountPlugin,
      coreAccountQueryPlugin,
      coreConsensusPlugin,
      coreConsensusQueryPlugin,
      coreTokenPlugin,
      coreTokenQueryPlugin,
      coreMiscQueriesPlugin,
      bonzoPlugin,
    ],
    context: { mode: AgentMode.AUTONOMOUS, ...context },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new HederaAIToolkit({ client: client as any, configuration });
}

export function getAgentToolkit(client?: Client): HederaAIToolkit {
  if (client) {
    return createAgentToolkit(client);
  }

  if (toolkitInstance) return toolkitInstance;

  const operatorClient = getHederaClient();
  const toolkit = createAgentToolkit(operatorClient);
  toolkitInstance = toolkit;
  return toolkit;
}
