import { NextResponse } from "next/server";
import {
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";
import { getHederaNetwork } from "@/lib/hedera-client";

export async function GET(request: Request) {
  try {
    const token = resolveSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        ok: true,
        connected: false,
        accountId: null,
        network: getHederaNetwork(),
        timestamp: new Date().toISOString(),
      });
    }

    const session = getSessionInfo(token);
    if (!session) {
      return NextResponse.json({
        ok: true,
        connected: false,
        accountId: null,
        network: getHederaNetwork(),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      accountId: session.accountId,
      network: session.network,
      expiresAt: session.expiresAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

