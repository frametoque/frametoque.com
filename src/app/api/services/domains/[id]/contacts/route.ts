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

    const defaultContact = {
      first_name: "",
      last_name: "",
      organization: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "LK",
      phone: "",
      email: domain.client_email,
    };

    const contacts = domain.registrant_contacts || {
      registrant: defaultContact,
      admin: defaultContact,
      technical: defaultContact,
      billing: defaultContact,
    };

    return NextResponse.json({ contacts });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { domain, sessionEmail } = await requireDomainOwnership(id);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rate = checkRateLimit(`contacts:write:${sessionEmail}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please wait ${rate.resetInSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { contacts } = body;

    if (!contacts || !contacts.registrant) {
      return NextResponse.json({ error: "Registrant contact information is required." }, { status: 400 });
    }

    const provider = getDomainProvider();
    await provider.updateContacts(domain.domain_name, contacts);

    await sql`
      UPDATE admin_domain_orders
      SET registrant_contacts = ${JSON.stringify(contacts)}::jsonb
      WHERE id = ${domain.id}
    `;

    await logDomainAudit(
      sessionEmail,
      domain.domain_name,
      "UPDATE_REGISTRANT_CONTACTS",
      { updated_by: sessionEmail },
      ip
    );

    return NextResponse.json({
      success: true,
      message: "Domain contact details updated and synced with registry.",
      contacts,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

