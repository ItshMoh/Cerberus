import { NextResponse } from "next/server";
import { getHederaClient } from "@/lib/hedera-client";
import { getAgentToolkit } from "@/lib/agent-toolkit";

export async function GET() {
  try {
    const client = getHederaClient();
    const network = client.ledgerId?.toString() || "unknown";
    const operatorId = process.env.HEDERA_OPERATOR_ID;

    // Verify toolkit initializes with Bonzo plugin
    const toolkit = getAgentToolkit();
    const tools = toolkit.getTools();
    const toolNames = Object.keys(tools);

    return NextResponse.json({
      ok: true,
      hedera: {
        network,
        operatorId,
        connected: true,
      },
      agent: {
        toolCount: toolNames.length,
        tools: toolNames,
      },
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
