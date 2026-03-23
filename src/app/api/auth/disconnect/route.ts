import { NextResponse } from "next/server";
import {
  destroyUserSession,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

export async function POST(request: Request) {
  try {
    const token = resolveSessionTokenFromRequest(request);
    if (token) {
      destroyUserSession(token);
    }

    const response = NextResponse.json({
      ok: true,
      disconnected: true,
      timestamp: new Date().toISOString(),
    });
    response.headers.append(
      "Set-Cookie",
      "bonzo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    return response;
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

