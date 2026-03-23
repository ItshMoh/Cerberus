import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/services/user-session";
import { getHederaNetwork } from "@/lib/hedera-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = String(body?.accountId || "").trim();
    const privateKey = String(body?.privateKey || "").trim();

    if (!accountId || !privateKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "accountId and privateKey are required",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const session = await createUserSession(accountId, privateKey);
    const response = NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      sessionToken: session.token,
      accountId: session.accountId,
      network: getHederaNetwork(),
      expiresAt: session.expiresAt,
    });
    response.headers.append(
      "Set-Cookie",
      `bonzo_session=${encodeURIComponent(
        session.token
      )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to connect account",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

