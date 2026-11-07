"use server";

import sql from "@/lib/db";
import { requireUserSession } from "@/lib/auth-guard";
import { logSystemAction } from "@/lib/logger";
import { reactivateDomainAfterRenewalPayment } from "./domains-shared";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

const PAYMENTS_LK_API_URL = "https://api.payments.lk/v1";

/**
 * Ensures the online_payments table exists for tracking gateway transactions.
 */
export async function ensureOnlinePaymentsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS online_payments (
        id SERIAL PRIMARY KEY,
        checkout_id VARCHAR(255) UNIQUE,
        invoice_id VARCHAR(100) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'LKR',
        status VARCHAR(50) DEFAULT 'pending',
        gateway VARCHAR(50) DEFAULT 'payments.lk',
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        receipt_url TEXT,
        gateway_response JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (err) {
    console.warn("[Payments] Failed to ensure online_payments table exists:", err);
  }
}

/**
 * Computes next available numeric ID for admin_incomes table.
 * Does NOT require an admin session so user payments can be recorded.
 */
export async function getNextIncomeReceiptId(tx: any = sql): Promise<number> {
  const existing = await tx`SELECT id FROM admin_incomes`;
  const usedIds = existing
    .map((r: any) => Number(r.id))
    .filter((n: number) => !isNaN(n))
    .sort((a: number, b: number) => a - b);

  let nextId = 1;
  for (const num of usedIds) {
    if (num === nextId) nextId++;
    else if (num > nextId) break;
  }
  return nextId;
}

/**
 * Helper to determine if the current request / runtime is in the live production environment.
 */
export async function isLiveEnvironment(): Promise<boolean> {
  if (process.env.VERCEL_ENV === "production") return true;

  try {
    const headerList = await headers();
    const host = (
      headerList.get("x-forwarded-host") ||
      headerList.get("host") ||
      ""
    ).toLowerCase();

    const cleanHost = host.split(":")[0];

    // Localhost or local network is never live
    if (
      cleanHost === "localhost" ||
      cleanHost === "127.0.0.1" ||
      cleanHost.endsWith(".local") ||
      cleanHost.endsWith(".internal")
    ) {
      return false;
    }

    if (cleanHost.includes("frametoque.com")) {
      return true;
    }

    if (process.env.NODE_ENV === "production" && cleanHost && cleanHost !== "localhost") {
      return true;
    }
  } catch {
    // If headers() is unavailable
    if (process.env.NODE_ENV === "production") {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();
      if (
        appUrl.includes("frametoque.com") ||
        (!appUrl.includes("localhost") && !appUrl.includes("127.0.0.1"))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether card payment is available.
 * If the Payments.lk secret key starts with 'sk_test_', card payments are disabled on live.
 */
export async function getCardPaymentAvailability(): Promise<{
  available: boolean;
  reason?: string;
  isTestKey: boolean;
  isLive: boolean;
}> {
  const secretKey = (
    process.env.PAYMENTS_LK_SECRET_KEY ||
    process.env.PAYMENT_LK_SECRET_KEY ||
    ""
  ).trim();

  if (!secretKey) {
    return {
      available: false,
      reason: "Payments.lk secret key is not configured.",
      isTestKey: false,
      isLive: false,
    };
  }

  const isTestKey = secretKey.startsWith("sk_test_");
  const isLive = await isLiveEnvironment();

  if (isTestKey && isLive) {
    return {
      available: false,
      reason: "Card payment is disabled on live because Payments.lk is running with a test key (sk_test_).",
      isTestKey: true,
      isLive: true,
    };
  }

  return {
    available: true,
    isTestKey,
    isLive,
  };
}

/**
 * Initiates a hosted checkout session with Payments.lk.
 */
export async function createCardPaymentCheckout(params: {
  invoiceId: string;
  amount?: number | string;
  returnUrl?: string;
}) {
  const session = await requireUserSession();

  try {
    const { invoiceId, amount, returnUrl } = params;
    if (!invoiceId) {
      return { success: false, error: "Invoice ID is required" };
    }

    const availability = await getCardPaymentAvailability();
    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || "Card payments are disabled on live in test mode. Please use Bank Transfer.",
      };
    }

    const secretKey = process.env.PAYMENTS_LK_SECRET_KEY || process.env.PAYMENT_LK_SECRET_KEY;
    if (!secretKey) {
      return {
        success: false,
        error: "Payments.lk API secret key is not configured in environment variables",
      };
    }

    // Fetch invoice from database
    const invoiceRows = await sql`
      SELECT 
        i.invoice_id,
        i.user_email,
        i.project_name,
        i.currency,
        i.total,
        i.total_due,
        i.payment_status,
        i.category,
        COALESCE(ac.full_name, i.user_email) as client_name
      FROM invoices i
      LEFT JOIN admin_clients ac ON LOWER(i.user_email) = LOWER(ac.email)
      WHERE i.invoice_id = ${invoiceId}
    `;

    if (invoiceRows.length === 0) {
      return { success: false, error: "Invoice not found" };
    }

    const invoice = invoiceRows[0];

    // Authorization check: Only invoice owner or admin can pay
    if (!session.isAdmin) {
      const invEmail = (invoice.user_email || "").toLowerCase().trim();
      const sessionEmail = (session.email || "").toLowerCase().trim();
      if (!sessionEmail || (invEmail && invEmail !== sessionEmail)) {
        return {
          success: false,
          error: "Unauthorized: Invoice does not belong to your account",
        };
      }
    }

    const currentDue = parseFloat(
      invoice.total_due != null ? invoice.total_due : invoice.total || "0"
    );
    if (currentDue <= 0.009 || invoice.payment_status === "fully paid") {
      return { success: false, error: "This invoice is already fully paid" };
    }

    const isDomainInvoice = String(invoice.category || "").toLowerCase() === "domain";
    let basePayAmount = isDomainInvoice ? currentDue : parseFloat(String(amount ?? currentDue));

    if (!Number.isFinite(basePayAmount) || basePayAmount <= 0) {
      return { success: false, error: "Please enter a valid payment amount" };
    }

    if (basePayAmount > currentDue + 0.0001) {
      // Gracefully cap to current remaining due if client had stale due balance
      basePayAmount = currentDue;
    }

    // Client pays the Payments.lk gateway fee on top using gross-up surcharge formula:
    // total = base / (1 - 0.0229), so after Payments.lk takes 2.29% of total, net received is exactly basePayAmount
    const totalChargeAmount = Math.ceil((basePayAmount / (1 - 0.0229)) * 100) / 100;
    const feeAmount = parseFloat((totalChargeAmount - basePayAmount).toFixed(2));

    // Convert to cents as required by Payments.lk (e.g., Rs. 10,229.00 -> 1022900 cents)
    const amountCents = Math.round(totalChargeAmount * 100);

    // Resolve application base URL
    const headerList = await headers();
    const host = headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") || "https";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : "https://frametoque.com");

    const idempotencyKey = `chk_${invoiceId}_${Date.now()}`;
    const description = `Payment for Invoice #${invoiceId}${
      invoice.project_name ? ` - ${invoice.project_name}` : ""
    }`.slice(0, 150);

    const customerEmail = (invoice.user_email || session.email || "").trim();
    const customerName = (invoice.client_name || session.email?.split("@")[0] || "Customer").trim();

    const destPath = returnUrl && returnUrl.startsWith("/") ? returnUrl : `/dashboard/invoice/${invoiceId}`;
    const sep = destPath.includes("?") ? "&" : "?";
    const successUrl = `${appUrl}${destPath}${sep}payment=success&invoice_id=${invoiceId}`;
    const cancelUrl = `${appUrl}${destPath}${sep}payment=cancelled&invoice_id=${invoiceId}`;

    // Payments.lk strict payload: amountCents, description, reference, successUrl, cancelUrl, and optional customer
    const payload: Record<string, any> = {
      amountCents,
      description,
      reference: String(invoiceId),
      successUrl,
      cancelUrl,
    };

    if (customerEmail && customerEmail.includes("@")) {
      payload.customer = {
        name: customerName || "Customer",
        email: customerEmail,
      };
    }

    // Call Payments.lk Checkout endpoint
    const response = await fetch(`${PAYMENTS_LK_API_URL}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const fieldErrors = Array.isArray(errorData.fields)
        ? errorData.fields.map((f: any) => f.message).join(", ")
        : null;
      let errorMsg =
        fieldErrors ||
        errorData.message ||
        errorData.error ||
        `Payments.lk gateway returned HTTP status ${response.status}`;
      console.error("[Payments.lk] Create checkout failed:", errorMsg, errorData);

      const lower = String(errorMsg).toLowerCase();
      if (
        lower.includes("plan's limit") ||
        lower.includes("plan limit") ||
        lower.includes("limit of rs") ||
        lower.includes("upgrade in the dashboard") ||
        lower.includes("request an upgrade") ||
        lower.includes("card payments past your plan")
      ) {
        errorMsg = "Card payments not available right now. Please use Bank Transfer.";
      }

      return { success: false, error: errorMsg };
    }

    const checkoutData = await response.json();
    if (!checkoutData.url) {
      return { success: false, error: "Payment gateway did not return a checkout URL" };
    }

    // Record checkout attempt in online_payments table
    try {
      const currency = invoice.currency || "LKR";
      await ensureOnlinePaymentsTable();
      await sql`
        INSERT INTO online_payments (
          checkout_id,
          invoice_id,
          amount,
          currency,
          status,
          gateway,
          customer_email,
          customer_name,
          gateway_response
        ) VALUES (
          ${checkoutData.id || idempotencyKey},
          ${invoiceId},
          ${totalChargeAmount},
          ${currency},
          'pending',
          'payments.lk',
          ${customerEmail},
          ${customerName},
          ${sql.json({
            ...checkoutData,
            base_amount: basePayAmount,
            fee_amount: feeAmount,
            total_charged: totalChargeAmount,
          })}
        )
        ON CONFLICT (checkout_id) DO NOTHING
      `;
    } catch (dbErr) {
      console.warn("[Payments.lk] Could not record pending checkout in DB:", dbErr);
    }

    return {
      success: true,
      url: checkoutData.url,
      checkoutId: checkoutData.id,
    };
  } catch (err: any) {
    console.error("[Payments.lk] Checkout error:", err);
    return { success: false, error: err.message || "An unexpected error occurred" };
  }
}

/**
 * Extracts the Payments.lk transaction fee from the gateway payload or calculates the standard 2.29%.
 */
function extractPaymentsLkFee(amount: number, gatewayResponse?: any): number {
  if (gatewayResponse) {
    const rawFeeCents =
      gatewayResponse.feeCents ??
      gatewayResponse.payment?.feeCents ??
      gatewayResponse.data?.feeCents ??
      gatewayResponse.data?.payment?.feeCents;

    if (typeof rawFeeCents === "number" && rawFeeCents > 0) {
      return parseFloat((rawFeeCents / 100).toFixed(2));
    }

    const rawFee =
      gatewayResponse.fee ??
      gatewayResponse.payment?.fee ??
      gatewayResponse.data?.fee ??
      gatewayResponse.data?.payment?.fee;

    if (rawFee != null && !isNaN(parseFloat(rawFee)) && parseFloat(rawFee) > 0) {
      return parseFloat(parseFloat(rawFee).toFixed(2));
    }
  }

  // Fallback: Payments.lk standard gross-up surcharge fee
  const total = Math.ceil((amount / (1 - 0.0229)) * 100) / 100;
  return parseFloat((total - amount).toFixed(2));
}

/**
 * Applies a verified card payment to an invoice idempotently.
 */
export async function processPaymentSucceeded(params: {
  invoiceId: string;
  amount: number;
  transactionId: string;
  currency?: string;
  customerEmail?: string;
  receiptUrl?: string | null;
  gatewayResponse?: any;
}) {
  const {
    invoiceId,
    amount,
    transactionId,
    currency,
    customerEmail,
    receiptUrl,
    gatewayResponse,
  } = params;

  // Use a transaction with Postgres advisory xact lock to serialize concurrent syncs for the same invoice
  return await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`invoice_pay_${invoiceId}`}))`;

    // 0. Check online_payments: if this transaction was marked 'deleted' or 'ignored', never process
    try {
      await ensureOnlinePaymentsTable();
      const op = await tx`
        SELECT status FROM online_payments 
        WHERE checkout_id = ${transactionId} 
           OR (checkout_id = ${gatewayResponse?.checkoutId || ''} AND checkout_id != '')
        LIMIT 1
      `;
      if (op.length > 0 && (op[0].status === 'deleted' || op[0].status === 'ignored')) {
        return { success: true, alreadyProcessed: true, ignored: true };
      }
    } catch (e) {}

    // 1. Fetch invoice
    const invoiceRows = await tx`SELECT * FROM invoices WHERE invoice_id = ${invoiceId}`;
    if (invoiceRows.length === 0) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }
    const invoice = invoiceRows[0];

    // 1b. Validate timestamp: Payment must not pre-date current invoice creation date
    if (invoice.created_at) {
      const invTime = new Date(invoice.created_at).getTime();
      const payRawTime = gatewayResponse?.createdAt || gatewayResponse?.succeededAt;
      if (payRawTime) {
        const payTime = new Date(payRawTime).getTime();
        // Allow 5 minutes clock skew, but reject anything older (e.g. from an older deleted invoice)
        if (payTime < invTime - 5 * 60 * 1000) {
          console.warn(
            `[Payments] Payment ${transactionId} pre-dates invoice ${invoiceId} (created: ${new Date(invTime).toISOString()}). Ignoring.`
          );
          try {
            await tx`
              INSERT INTO online_payments (checkout_id, invoice_id, amount, status)
              VALUES (${transactionId}, ${invoiceId}, ${amount}, 'deleted')
              ON CONFLICT (checkout_id) DO UPDATE SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
            `;
          } catch (e) {}
          return { success: true, alreadyProcessed: true, ignored: true };
        }
      }
    }

    // 1c. Determine base invoice amount to credit (excluding the client-paid 2.29% gateway fee)
    let invoiceCreditAmount = amount;
    try {
      const opRecord = await tx`
        SELECT amount, gateway_response FROM online_payments
        WHERE checkout_id = ${transactionId} 
           OR (checkout_id = ${gatewayResponse?.checkoutId || ''} AND checkout_id != '')
        LIMIT 1
      `;
      if (opRecord.length > 0 && opRecord[0].gateway_response?.base_amount) {
        const parsed = parseFloat(opRecord[0].gateway_response.base_amount);
        if (!isNaN(parsed) && parsed > 0) invoiceCreditAmount = parsed;
      } else if (gatewayResponse?.netCents) {
        invoiceCreditAmount = parseFloat((gatewayResponse.netCents / 100).toFixed(2));
      } else {
        // Fallback: gross-up surcharge inverse: base = total * (1 - 0.0229)
        const computedBase = parseFloat((amount * (1 - 0.0229)).toFixed(2));
        invoiceCreditAmount = computedBase;
      }
    } catch (e) {}

    // 2. Comprehensive Idempotency & Deduplication Check:
    // Gather all aliases of this transaction (payment ID, checkout ID, etc.)
    const idsToCheck: string[] = [];
    if (transactionId) idsToCheck.push(transactionId);
    if (gatewayResponse?.id) idsToCheck.push(gatewayResponse.id);
    if (gatewayResponse?.checkoutId) idsToCheck.push(gatewayResponse.checkoutId);
    if (gatewayResponse?.paymentId) idsToCheck.push(gatewayResponse.paymentId);
    if (gatewayResponse?.payment?.id) idsToCheck.push(gatewayResponse.payment.id);
    const uniqueIds = Array.from(new Set(idsToCheck.filter(Boolean)));

    // Check if any of these IDs is already in admin_incomes description
    const existingIncomes = await tx`
      SELECT id, description FROM admin_incomes 
      WHERE invoice_id = ${invoiceId}
    `;
    const alreadyInIncome = existingIncomes.some((inc: any) =>
      uniqueIds.some((id) => inc.description && inc.description.includes(id))
    );
    if (alreadyInIncome) {
      return { success: true, alreadyProcessed: true };
    }

    const currentDue = parseFloat(
      invoice.total_due != null ? invoice.total_due : invoice.total || "0"
    );

    // If invoice is already paid and remaining due is 0, reject duplicate entries
    if (currentDue <= 0.009 && (invoice.payment_status === "paid" || invoice.payment_status === "fully paid")) {
      await logSystemAction(`[Payments] Invoice ${invoiceId} is already fully settled. Skipping duplicate.`);
      return { success: true, alreadyProcessed: true };
    }

    const paidAmount = parseFloat(invoiceCreditAmount.toFixed(2));
    const newTotalDue = Math.max(0, parseFloat((currentDue - paidAmount).toFixed(2)));

    let newStatus = "unpaid";
    if (newTotalDue < 0.01) {
      newStatus = "paid";
    } else {
      newStatus = "partially paid";
    }

    // 3. Find client ID
    let clientId = null;
    if (invoice.user_email) {
      const clientRows = await tx`
        SELECT id FROM admin_clients WHERE LOWER(email) = LOWER(${invoice.user_email}) LIMIT 1
      `;
      if (clientRows.length > 0) {
        clientId = clientRows[0].id;
      }
    }

    // Fallback to default bank account if invoice has no account linked
    let accountId = invoice.bank_account_id;
    if (!accountId) {
      try {
        const defaultAcc = await tx`SELECT id FROM admin_accounts WHERE type = 'Bank Account' LIMIT 1`;
        if (defaultAcc.length > 0) accountId = defaultAcc[0].id;
      } catch (e) {
        // ignore
      }
    }

    // 4. Generate next income ID & record transaction in admin_incomes table
    const nextId = await getNextIncomeReceiptId(tx);
    // Prefer actual payment id (pay_...) over checkout id (chk_...) for description reference
    const preferredRef =
      uniqueIds.find((id) => id.startsWith("pay_")) ||
      transactionId ||
      uniqueIds[0];
    const description = `Card Payment for ${invoice.project_name || "Project"} (Ref: ${preferredRef})`;
    const category = invoice.category || "Web dev";

    await tx`
      INSERT INTO admin_incomes (id, date, amount, description, category, payment_method, invoice_id, client_id, receipt_url, account_id)
      VALUES (
        ${nextId}, 
        CURRENT_DATE, 
        ${paidAmount}, 
        ${description}, 
        ${category}, 
        'Card Payment', 
        ${invoiceId}, 
        ${clientId}, 
        ${receiptUrl || null}, 
        ${accountId || null}
      )
    `;

    // 5. Update invoice status to paid and remaining balance to 0
    await tx`
      UPDATE invoices
      SET payment_status = ${newStatus},
          total_due = ${newTotalDue}
      WHERE invoice_id = ${invoiceId}
    `;

    // 6. Reactivate domain if fully paid
    if (newStatus === "paid" || newStatus === "fully paid") {
      try {
        await reactivateDomainAfterRenewalPayment(invoiceId);
      } catch (e) {
        console.error("[Payments] Domain reactivation error:", e);
      }
    }

    // 7. Update online_payments table
    try {
      await ensureOnlinePaymentsTable();
      await tx`
        INSERT INTO online_payments (
          checkout_id, invoice_id, amount, currency, status, gateway, customer_email, receipt_url, gateway_response
        ) VALUES (
          ${preferredRef}, ${invoiceId}, ${paidAmount}, ${currency || "LKR"}, 'succeeded', 'payments.lk', ${customerEmail || invoice.user_email}, ${receiptUrl || null}, ${tx.json(gatewayResponse || {})}
        )
        ON CONFLICT (checkout_id) DO UPDATE 
        SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
      `;
      // Also mark the original checkout session succeeded if different
      if (gatewayResponse?.checkoutId && gatewayResponse.checkoutId !== preferredRef) {
        await tx`
          UPDATE online_payments 
          SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
          WHERE checkout_id = ${gatewayResponse.checkoutId}
        `;
      }
    } catch (tableErr) {
      console.warn("[Payments] online_payments update error:", tableErr);
    }

    await logSystemAction(
      `Card payment verified for invoice ${invoiceId}. Amount: ${paidAmount} via Payments.lk (${preferredRef}).`
    );

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/income");
    revalidatePath("/admin/expenses");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoice/${invoiceId}`);

    return { success: true, alreadyProcessed: false };
  });
}

const inflightSyncs = new Map<string, Promise<any>>();

/**
 * Checks checkout status with Payments.lk and applies the payment if succeeded.
 * Serves as instantaneous fallback when user returns to successUrl.
 */
export async function verifyAndSyncCardPayment(params: {
  invoiceId: string;
  checkoutId?: string;
}) {
  const syncKey = `${params.invoiceId}`;
  if (inflightSyncs.has(syncKey)) {
    return inflightSyncs.get(syncKey)!;
  }
  const promise = (async () => {
    try {
      return await verifyAndSyncCardPaymentInternal(params);
    } finally {
      setTimeout(() => inflightSyncs.delete(syncKey), 4000);
    }
  })();
  inflightSyncs.set(syncKey, promise);
  return promise;
}

async function verifyAndSyncCardPaymentInternal(params: {
  invoiceId: string;
  checkoutId?: string;
}) {
  const session = await requireUserSession();
  const { invoiceId, checkoutId } = params;

  try {
    const secretKey = process.env.PAYMENTS_LK_SECRET_KEY || process.env.PAYMENT_LK_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: "Payments.lk secret key is not configured" };
    }

    // Fetch target invoice to obtain creation timestamp
    const invoiceRows = await sql`
      SELECT invoice_id, payment_status, total_due, created_at 
      FROM invoices 
      WHERE invoice_id = ${invoiceId}
    `;
    if (invoiceRows.length === 0) {
      return { success: false, error: "Invoice not found" };
    }
    const currentInvoice = invoiceRows[0];
    const invCreatedAt = currentInvoice.created_at ? new Date(currentInvoice.created_at).getTime() : 0;

    // 1. First, check Payments.lk GET /v1/payments directly.
    // This is the most reliable way to find completed transactions regardless of checkout redirects.
    try {
      const payRes = await fetch(`${PAYMENTS_LK_API_URL}/payments?limit=30`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      });

      if (payRes.ok) {
        const payList = await payRes.json();
        const items = Array.isArray(payList.data) ? payList.data : [];
        const match = items.find(
          (p: any) =>
            (p.reference === invoiceId ||
              String(p.description || "").includes(invoiceId) ||
              (p.metadata && (p.metadata.invoiceId === invoiceId || p.metadata.invoice_id === invoiceId))) &&
            String(p.status || "").toLowerCase() === "succeeded" &&
            (!invCreatedAt || new Date(p.createdAt || p.succeededAt || 0).getTime() >= invCreatedAt - 5 * 60 * 1000)
        );

        if (match) {
          const opCheck = await sql`
            SELECT status FROM online_payments 
            WHERE checkout_id = ${match.id} 
               OR (checkout_id = ${match.checkoutId || ''} AND checkout_id != '')
            LIMIT 1
          `;
          if (opCheck.length === 0 || (opCheck[0].status !== "deleted" && opCheck[0].status !== "ignored")) {
            const amount =
              match.amountCents != null
                ? match.amountCents / 100
                : parseFloat(match.amount || "0");

            const procRes = await processPaymentSucceeded({
              invoiceId,
              amount,
              transactionId: match.id,
              currency: match.currency,
              customerEmail: match.customer?.email,
              gatewayResponse: match,
            });

            if (procRes.success && !(procRes as any).ignored) {
              await syncMissingCardPaymentFees().catch(() => {});
              return { success: true, status: "succeeded" };
            }
          }
          return { success: true, status: match.status || "succeeded" };
        }
      }
    } catch (payListErr) {
      console.warn("[Payments.lk] /v1/payments check failed:", payListErr);
    }

    // 2. Fallback: Check checkout object if targetCheckoutId is available
    let targetCheckoutId = checkoutId;
    if (!targetCheckoutId) {
      try {
        await ensureOnlinePaymentsTable();
        const pending = await sql`
          SELECT checkout_id FROM online_payments
          WHERE invoice_id = ${invoiceId} AND status IN ('pending', 'created')
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (pending.length > 0) {
          targetCheckoutId = pending[0].checkout_id;
        }
      } catch (e) {
        // ignore
      }
    }

    if (!targetCheckoutId) {
      return { success: false, error: "No pending checkout session found to verify" };
    }

    const opTarget = await sql`
      SELECT status FROM online_payments WHERE checkout_id = ${targetCheckoutId} LIMIT 1
    `;
    if (opTarget.length > 0 && (opTarget[0].status === "deleted" || opTarget[0].status === "ignored")) {
      return { success: false, error: "Checkout session was deleted or cancelled" };
    }

    // Call Payments.lk GET /v1/checkouts/{id}
    const res = await fetch(`${PAYMENTS_LK_API_URL}/checkouts/${targetCheckoutId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Could not retrieve checkout from Payments.lk" };
    }

    const data = await res.json();
    const status = String(data.status || "").toLowerCase();
    const paymentStatus = String(data.payment?.status || "").toLowerCase();
    const isSucceeded =
      status === "succeeded" ||
      status === "paid" ||
      status === "completed" ||
      paymentStatus === "succeeded" ||
      paymentStatus === "paid" ||
      paymentStatus === "completed";

    if (isSucceeded) {
      const amount =
        data.amountCents != null
          ? data.amountCents / 100
          : parseFloat(data.amount || "0");

      const resolvedPaymentId = data.payment?.id || data.paymentId || data.id || targetCheckoutId;

      const procRes = await processPaymentSucceeded({
        invoiceId,
        amount,
        transactionId: resolvedPaymentId,
        currency: data.currency,
        customerEmail: data.customer?.email,
        gatewayResponse: data,
      });

      if (procRes.success && !(procRes as any).ignored) {
        await syncMissingCardPaymentFees().catch(() => {});
        return { success: true, status: "succeeded" };
      }
    }

    return { success: true, status: data.status || "pending" };
  } catch (err: any) {
    console.error("[Payments.lk] verifyAndSyncCardPayment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Syncs all succeeded payments from Payments.lk for any invoice in the system.
 */
export async function syncAllCardPayments() {
  try {
    const secretKey = process.env.PAYMENTS_LK_SECRET_KEY || process.env.PAYMENT_LK_SECRET_KEY;
    if (!secretKey) return { success: false, error: "No secret key configured" };

    const payRes = await fetch(`${PAYMENTS_LK_API_URL}/payments?limit=50`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    if (!payRes.ok) return { success: false, error: "Failed to fetch payments from Payments.lk" };

    const payList = await payRes.json();
    const items = Array.isArray(payList.data) ? payList.data : [];
    let syncedCount = 0;

    for (const p of items) {
      if (String(p.status || "").toLowerCase() !== "succeeded") continue;

      let invId = p.reference;
      if (!invId && p.description) {
        const m = p.description.match(/INV-\d+/i);
        if (m) invId = m[0];
      }

      if (!invId) continue;

      // Check if this payment or checkout was deleted or ignored by admin
      const op = await sql`
        SELECT status FROM online_payments
        WHERE checkout_id = ${p.id} 
           OR (checkout_id = ${p.checkoutId || ''} AND checkout_id != '')
        LIMIT 1
      `;
      if (op.length > 0 && (op[0].status === "deleted" || op[0].status === "ignored")) {
        continue;
      }

      // Check invoice creation timestamp
      const invRows = await sql`SELECT created_at FROM invoices WHERE invoice_id = ${invId}`;
      if (invRows.length === 0) continue;

      const invCreatedAt = invRows[0].created_at ? new Date(invRows[0].created_at).getTime() : 0;
      const paymentCreatedAt = new Date(p.createdAt || p.succeededAt || 0).getTime();
      if (invCreatedAt && paymentCreatedAt < invCreatedAt - 5 * 60 * 1000) {
        // Payment was created before this invoice existed; belongs to a deleted invoice with same ID
        try {
          await sql`
            INSERT INTO online_payments (checkout_id, invoice_id, amount, status)
            VALUES (${p.id}, ${invId}, ${p.amountCents ? p.amountCents / 100 : 0}, 'deleted')
            ON CONFLICT (checkout_id) DO UPDATE SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
          `;
        } catch (e) {}
        continue;
      }

      const amount =
        p.amountCents != null ? p.amountCents / 100 : parseFloat(p.amount || "0");

      const res = await processPaymentSucceeded({
        invoiceId: invId,
        amount,
        transactionId: p.id,
        currency: p.currency,
        customerEmail: p.customer?.email,
        gatewayResponse: p,
      });

      if (res.success && !res.alreadyProcessed && !(res as any).ignored) {
        syncedCount++;
      }
    }

    await syncMissingCardPaymentFees().catch(() => {});

    return { success: true, syncedCount };
  } catch (err: any) {
    console.error("[Payments] syncAllCardPayments error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Audits card payment transactions.
 * Note: Gateway service fee is charged directly to the client at checkout and is not recorded as an admin expense.
 */
export async function syncMissingCardPaymentFees() {
  return { success: true, createdCount: 0 };
}

