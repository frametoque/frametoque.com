import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { createSign } from "crypto";

const ISSUER_ID    = process.env.GOOGLE_WALLET_ISSUER_ID!;
const CLIENT_EMAIL = process.env.GOOGLE_WALLET_CLIENT_EMAIL!;
const PRIVATE_KEY  = (process.env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL!;

const CLASS_SUFFIX = "invoice_pass_v2";
const CLASS_ID     = `${ISSUER_ID}.${CLASS_SUFFIX}`;

/* ── Auth client for Wallet API calls ── */
function getAuthClient() {
  return new GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
}

/* ── Sign a JWT using Node crypto — works with PKCS8 natively ── */
function signJwt(payload: object): string {
  const header    = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body      = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsigned  = `${header}.${body}`;
  const signer    = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(PRIVATE_KEY, "base64url");
  return `${unsigned}.${signature}`;
}

/* ── Create the pass Class once, idempotent ── */
async function ensureClass(authClient: GoogleAuth) {
  const accessToken = await authClient.getAccessToken();

  const checkRes = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${CLASS_ID}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  console.log("[google-wallet] Class check status:", checkRes.status);

  if (checkRes.status === 404) {
    console.log("[google-wallet] Class not found — creating...");

    const createRes = await fetch(
      "https://walletobjects.googleapis.com/walletobjects/v1/genericClass",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: CLASS_ID,
          issuerName: "Frame Toque",
          reviewStatus: "UNDER_REVIEW",

          logo: {
            sourceUri: {
              uri: `${APP_URL}/logos/ft/logo-main.png`,
            },
            contentDescription: {
              defaultValue: { language: "en-US", value: "Frame Toque Logo" },
            },
          },

          classTemplateInfo: {
            cardTemplateOverride: {
              cardRowTemplateInfos: [
                {
                  twoItems: {
                    startItem: {
                      firstValue: {
                        fields: [{ fieldPath: "object.textModulesData['invoice_id']" }],
                      },
                    },
                    endItem: {
                      firstValue: {
                        fields: [{ fieldPath: "object.textModulesData['issued']" }],
                      },
                    },
                  },
                },
                {
                  twoItems: {
                    startItem: {
                      firstValue: {
                        fields: [{ fieldPath: "object.textModulesData['project_status']" }],
                      },
                    },
                    endItem: {
                      firstValue: {
                        fields: [{ fieldPath: "object.textModulesData['payment_status']" }],
                      },
                    },
                  },
                },
              ],
            },
          },
        }),
      }
    );

    const createBody = await createRes.json();
    console.log("[google-wallet] Class create response:", JSON.stringify(createBody, null, 2));

    if (!createRes.ok) {
      throw new Error(`Class creation failed: ${JSON.stringify(createBody)}`);
    }

  } else if (!checkRes.ok) {
    const body = await checkRes.json();
    throw new Error(`Class check failed: ${JSON.stringify(body)}`);
  }
}

/* ── Build the pass Object ── */
function buildPassObject(invoice: Record<string, any>) {
  const objectId = `${ISSUER_ID}.invoice_${invoice.invoice_id}`;

  const currencyLabel = invoice.currency === "LKR" ? "Rs." : (invoice.currency ?? "");
  const totalDue = (
    parseFloat(invoice.subtotal ?? 0) -
    parseFloat(invoice.discount ?? 0) -
    parseFloat(invoice.advance  ?? 0)
  ).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const issueDate = invoice.date
    ? new Date(invoice.date).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "N/A";

  return {
    id: objectId,
    classId: CLASS_ID,
    state: "ACTIVE",

    cardTitle: {
      defaultValue: { language: "en-US", value: "Frame Toque" },
    },
    subheader: {
      defaultValue: { language: "en-US", value: invoice.project_name ?? "Invoice" },
    },
    header: {
      defaultValue: {
        language: "en-US",
        value: `${currencyLabel} ${totalDue}`,
      },
    },

    heroImage: {
      sourceUri: {
        uri: `${APP_URL}/og-image.png`,
      },
      contentDescription: {
        defaultValue: { language: "en-US", value: "Frame Toque" },
      },
    },

    barcode: {
      type: "QR_CODE",
      value: `${APP_URL}/dashboard/invoice/${invoice.invoice_id}`,
      alternateText: invoice.invoice_id,
    },

    textModulesData: [
      {
        id: "invoice_id",
        header: "Invoice ID",
        body: invoice.invoice_id ?? "—",
      },
      {
        id: "issued",
        header: "Issued",
        body: issueDate,
      },
      {
        id: "project_status",
        header: "Project Status",
        body: invoice.work_status ?? "Pending",
      },
      {
        id: "payment_status",
        header: "Payment",
        body: invoice.payment_status ?? "Unpaid",
      },
    ],
  };
}

/* ── POST /api/invoice/[invoice_id]/google-wallet ── */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ invoice_id: string }> }
) {
  try {
    const { invoice_id } = await params;
    console.log("[google-wallet] Generating pass for invoice:", invoice_id);

    /* 1. Fetch invoice */
    const invoiceRes = await fetch(`${APP_URL}/api/invoice/${invoice_id}`);
    if (!invoiceRes.ok) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const invoice = await invoiceRes.json();
    console.log("[google-wallet] Invoice fetched:", invoice.invoice_id);

    /* 2. Auth + ensure class */
    const authClient = getAuthClient();
    await ensureClass(authClient);

    /* 3. Build pass object */
    const passObject = buildPassObject(invoice);

    /* 4. Sign JWT using Node crypto — no extra packages, PKCS8 native */
    const claims = {
      iss: CLIENT_EMAIL,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        genericObjects: [passObject],
      },
    };

    const token   = signJwt(claims);
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    console.log("[google-wallet] Save URL generated successfully");
    return NextResponse.json({ saveUrl });

  } catch (err: any) {
    console.error("[google-wallet] Error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to generate Google Wallet pass" },
      { status: 500 }
    );
  }
}