import { NextResponse } from "next/server";
import {
  createStrategyConfig,
  deleteStrategyConfig,
  getStrategyConfig,
  listStrategyConfigs,
  strategyConfigSchema,
  updateStrategyConfig,
} from "@/lib/services/strategy-config";
import {
  getSessionInfo,
  resolveSessionTokenFromRequest,
} from "@/lib/services/user-session";

function requireSession(request: Request): { token: string; error?: NextResponse } {
  const token = resolveSessionTokenFromRequest(request);
  if (!token || !getSessionInfo(token)) {
    return {
      token: "",
      error: NextResponse.json(
        {
          ok: false,
          error: "Valid session token required",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      ),
    };
  }
  return { token };
}

export async function GET(request: Request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    const strategy = getStrategyConfig(auth.token, id);
    if (!strategy) {
      return NextResponse.json(
        {
          ok: false,
          error: "Strategy not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, strategy, timestamp: new Date().toISOString() });
  }

  return NextResponse.json({
    ok: true,
    strategies: listStrategyConfigs(auth.token),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = strategyConfigSchema.parse(body);
    const strategy = createStrategyConfig(auth.token, parsed);
    return NextResponse.json({
      ok: true,
      strategy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid strategy config",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "id is required",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const parsed = strategyConfigSchema.parse(body?.config || body);
    const updated = updateStrategyConfig(auth.token, id, parsed);
    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          error: "Strategy not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      strategy: updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid update payload",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = requireSession(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error: "id query param is required",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  const removed = deleteStrategyConfig(auth.token, id);
  if (!removed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Strategy not found",
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: true,
    id,
    timestamp: new Date().toISOString(),
  });
}

