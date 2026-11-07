import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { processPaymentSucceeded } from "@/app/(dashboard)/admin/actions/payments";

export async function POST(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") || "payments_lk";

  if (provider !== "payments_lk") {
    return NextResponse.json(
      { error: `Unsupported payment provider: ${provider}` },
      { status: 400 }
    );
  }

  try {
    const webhookSecret =
      process.env.PAYMENTS_LK_WEBHOOK_SECRET || process.env.PAYMENT_LK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Payments.lk Webhook] PAYMENTS_LK_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret is not configured in server environment" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("payments-signature") || req.headers.get("Payments-Signature");

    if (!signatureHeader) {
      console.warn("[Payments.lk Webhook] Missing payments-signature header");
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // Parse header format: t=timestamp,v1=signature
    let timestamp: number | null = null;
    const signatures: string[] = [];

    for (const part of signatureHeader.split(",")) {
      const [prefix, value] = part.trim().split("=");
      if (prefix === "t") timestamp = parseInt(value, 10);
      if (prefix === "v1") signatures.push(value);
    }

    if (!timestamp || signatures.length === 0) {
      console.warn("[Payments.lk Webhook] Invalid signature header structure:", signatureHeader);
      return NextResponse.json({ error: "Invalid signature header format" }, { status: 400 });
    }

    // Check drift tolerance (300 seconds / 5 mins)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      console.warn(
        `[Payments.lk Webhook] Timestamp drifted beyond tolerance: now=${now}, header=${timestamp}`
      );
      return NextResponse.json({ error: "Timestamp out of range" }, { status: 400 });
    }

    // Compute expected HMAC-SHA256 signature
    const signedPayload = `${timestamp}.${rawBody}`;
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signedPayload)
      .digest("hex");

    const matchFound = signatures.some((sig) => {
      try {
        const sigBuf = Buffer.from(sig, "hex");
        const compBuf = Buffer.from(computedSignature, "hex");
        return sigBuf.length === compBuf.length && crypto.timingSafeEqual(sigBuf, compBuf);
      } catch {
        return false;
      }
    });

    if (!matchFound) {
      console.warn("[Payments.lk Webhook] Webhook signature verification failed");
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // Health ping / test event
    if (event.type === "test.ping" || event.type === "ping") {
      return NextResponse.json({ received: true, pong: true }, { status: 200 });
    }

    // Successful payment notification
    if (event.type === "payment.succeeded") {
      const data = event.data || {};
      const invoiceId = data.reference || data.metadata?.invoiceId || data.metadata?.invoice_id;
      const amountCents = data.amountCents;
      const amount =
        amountCents != null ? amountCents / 100 : parseFloat(data.amount || "0");
      const transactionId = data.id || event.id;

      if (!invoiceId) {
        console.error(
          "[Payments.lk Webhook] Received payment.succeeded but no invoice reference found:",
          data
        );
        return NextResponse.json(
          { error: "Invoice reference not found in payload" },
          { status: 400 }
        );
      }

      await processPaymentSucceeded({
        invoiceId,
        amount,
        transactionId,
        currency: data.currency,
        customerEmail: data.customer?.email,
        receiptUrl: data.receiptUrl || data.receipt_url || null,
        gatewayResponse: event,
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("[Payments.lk Webhook] Exception during webhook processing:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") || "payments_lk";
  return NextResponse.json({
    status: "active",
    provider,
    message: "Payment webhook endpoint is online",
  });
}

