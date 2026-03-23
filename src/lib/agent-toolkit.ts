import {
  HederaAIToolkit,
  AgentMode,
  type Configuration,
  coreAccountPlugin,
  coreAccountQueryPlugin,
  coreConsensusPlugin,
  coreConsensusQueryPlugin,
  coreTokenPlugin,
  coreTokenQueryPlugin,
  coreMiscQueriesPlugin,
} from "hedera-agent-kit";
import { bonzoPlugin } from "@bonzofinancelabs/hak-bonzo-plugin";
import { getHederaClient } from "./hedera-client";

let toolkitInstance: HederaAIToolkit | null = null;

export function getAgentToolkit(): HederaAIToolkit {
  if (toolkitInstance) return toolkitInstance;

  const client = getHederaClient();

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
    context: {
      mode: AgentMode.AUTONOMOUS,
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolkit = new HederaAIToolkit({ client: client as any, configuration });

  toolkitInstance = toolkit;
  return toolkit;
}
