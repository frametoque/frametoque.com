import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight Health Check Endpoint.
 * Used for AWS EC2 target group health checks, uptime monitors, and container probes.
 * Exposes no secret or user data.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "frametoque-web",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

