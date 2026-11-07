import { NextRequest, NextResponse } from "next/server";
import { requireDomainOwnership } from "@/lib/domains/auth";
import { getDomainProvider } from "@/lib/domains/provider";
import { logDomainAudit } from "@/lib/domains/audit";
import { checkRateLimit } from "@/lib/domains/validation";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain } = await requireDomainOwnership(id);
    const provider = getDomainProvider();

    const transferStatus = await provider.getTransferStatus(domain.domain_name);

    return NextResponse.json({
      domain: domain.domain_name,
      locked: domain.locked ?? true,
      transfer_status: domain.transfer_status || transferStatus.status,
      message: transferStatus.message,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

/**
 * Handle Outbound Transfer Request (Unlock & generate EPP auth dispatch)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rate = checkRateLimit(`transfer:out:${sessionEmail}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many transfer requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const provider = getDomainProvider();
    const result = await provider.requestOutboundTransfer(domain.domain_name);

    await sql`
      UPDATE admin_domain_orders
      SET locked = false, transfer_status = 'outbound_requested'
      WHERE id = ${domain.id}
    `;

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "REQUEST_OUTBOUND_TRANSFER",
      { message: result.message },
      ip
    );

    return NextResponse.json({
      success: true,
      locked: false,
      transfer_status: "outbound_requested",
      message: result.message,
      requiresManualSteps: result.requiresManualSteps,
      notice:
        "Registrar Lock has been unlocked. For security, ICANN requires an authorization code (EPP key). If not received in your inbox within 15 minutes, our admin team can manually dispatch it from the registry console.",
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

