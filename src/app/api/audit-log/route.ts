import { NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/services/hcs-logger";

/**
 * GET /api/audit-log
 *
 * Query params:
 * - limit?: number (default 50, max 200)
 * - topicId?: string
 * - vault?: string
 * - action?: string
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const topicId = searchParams.get("topicId") || undefined;
    const vault = searchParams.get("vault") || undefined;
    const action = searchParams.get("action") || undefined;

    const result = await getAuditLogs({
      topicId,
      limit,
      vault,
      action,
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      topicId: result.topicId,
      count: result.logs.length,
      logs: result.logs,
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

