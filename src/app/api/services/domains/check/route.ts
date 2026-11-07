import { NextRequest, NextResponse } from "next/server";
import { getDomainProvider, verifyDomainAvailability } from "@/lib/domains/provider";
import { validateDomainName, checkRateLimit } from "@/lib/domains/validation";
import { ensureDomainTables } from "@/lib/domains/migration";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

async function getPricingForTld(tld: string, provider?: any) {
  const cleanTld = tld.toLowerCase().replace(/^\./, "").trim();
  try {
    await ensureDomainTables();
    const rows = await sql`
      SELECT * FROM tld_pricing WHERE LOWER(tld) = LOWER(${cleanTld}) LIMIT 1
    `;

    const r = rows.length > 0 ? rows[0] : null;

    // Check if pricing is updated to the current day
    const isUpdatedToday =
      r &&
      r.updated_at &&
      new Date(r.updated_at).toDateString() === new Date().toDateString();

    // If NOT updated today (or not present in database), sync fresh pricing from Cloudflare
    if (!isUpdatedToday) {
      if (cleanTld === "lk") {
        const cost = 18.0;
        const markup = r ? parseFloat(r.markup) : 7.0;
        const selling = parseFloat((cost + markup).toFixed(2));
        await sql`
          INSERT INTO tld_pricing (tld, cost_price, markup, selling_price, renewal_cost, renewal_price, provider, updated_at)
          VALUES ('lk', ${cost}, ${markup}, ${selling}, ${cost}, ${selling}, 'LK Domain Registry', NOW())
          ON CONFLICT (tld) DO UPDATE SET
            cost_price = ${cost},
            selling_price = ${selling},
            renewal_cost = ${cost},
            renewal_price = ${selling},
            provider = 'LK Domain Registry',
            updated_at = NOW()
        `.catch((e) => console.warn("[LK Pricing Sync Error]:", e));

        return {
          regCost: cost,
          regRetail: selling,
          renewCost: cost,
          renewRetail: selling,
          provider: "LK Domain Registry",
          updatedAt: new Date().toISOString(),
          syncedToday: true,
        };
      }

      // Query Cloudflare Registrar for real-time wholesale cost
      try {
        const p = provider || getDomainProvider();
        const probeRes = await p.checkAvailability(`pricing-probe-${cleanTld}.${cleanTld}`);
        const liveCost =
          probeRes?.costPrice && probeRes.costPrice > 0
            ? Number(probeRes.costPrice)
            : r
            ? parseFloat(r.cost_price)
            : 10.46;

        const currentMarkup = r ? parseFloat(r.markup) : 5.5;
        const newSelling = parseFloat((liveCost + currentMarkup).toFixed(2));
        const newRenewal = parseFloat((liveCost + currentMarkup).toFixed(2));

        await sql`
          INSERT INTO tld_pricing (tld, cost_price, markup, selling_price, renewal_cost, renewal_price, provider, updated_at)
          VALUES (${cleanTld}, ${liveCost}, ${currentMarkup}, ${newSelling}, ${liveCost}, ${newRenewal}, 'Cloudflare', NOW())
          ON CONFLICT (tld) DO UPDATE SET
            cost_price = ${liveCost},
            renewal_cost = ${liveCost},
            selling_price = ${newSelling},
            renewal_price = ${newRenewal},
            provider = 'Cloudflare',
            updated_at = NOW()
        `.catch((e) => console.warn(`[Cloudflare TLD Sync Error for .${cleanTld}]:`, e));

        return {
          regCost: liveCost,
          regRetail: newSelling,
          renewCost: liveCost,
          renewRetail: newRenewal,
          provider: "Cloudflare",
          updatedAt: new Date().toISOString(),
          syncedToday: true,
        };
      } catch (cfErr: any) {
        console.warn(`[Cloudflare Live TLD Sync Notice for .${cleanTld}]:`, cfErr.message);
      }
    }

    if (r) {
      return {
        regCost: parseFloat(r.cost_price),
        regRetail: parseFloat(r.selling_price),
        renewCost: parseFloat(r.renewal_cost),
        renewRetail: parseFloat(r.renewal_price),
        provider: r.provider || "Cloudflare",
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        syncedToday: isUpdatedToday,
      };
    }
  } catch (err) {
    console.warn("[Pricing Lookup] fallback for TLD:", cleanTld, err);
  }

  // Fallback defaults
  const defaults: Record<string, any> = {
    com: { regCost: 10.46, regRetail: 15.96, renewCost: 10.46, renewRetail: 15.96, provider: "Cloudflare" },
    net: { regCost: 11.86, regRetail: 17.36, renewCost: 11.86, renewRetail: 17.36, provider: "Cloudflare" },
    org: { regCost: 8.5, regRetail: 14.0, renewCost: 11.2, renewRetail: 16.7, provider: "Cloudflare" },
    io: { regCost: 35.0, regRetail: 40.5, renewCost: 35.0, renewRetail: 40.5, provider: "Cloudflare" },
    xyz: { regCost: 2.99, regRetail: 8.49, renewCost: 12.99, renewRetail: 18.49, provider: "Cloudflare" },
    ca: { regCost: 9.19, regRetail: 14.69, renewCost: 9.19, renewRetail: 14.69, provider: "Cloudflare" },
    uk: { regCost: 5.3, regRetail: 10.8, renewCost: 5.3, renewRetail: 10.8, provider: "Cloudflare" },
    lk: { regCost: 18.0, regRetail: 25.0, renewCost: 18.0, renewRetail: 25.0, provider: "LK Domain Registry" },
  };

  return (
    defaults[cleanTld] || {
      regCost: 10.46,
      regRetail: 15.96,
      renewCost: 10.46,
      renewRetail: 15.96,
      provider: "Cloudflare",
      updatedAt: new Date().toISOString(),
      syncedToday: true,
    }
  );
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rate = checkRateLimit(`domain:search:${ip}`, 60, 60000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Search rate limit reached. Please wait ${rate.resetInSec} seconds.` },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Domain name is required." }, { status: 400 });
  }

  const val = validateDomainName(domain);
  if (!val.valid) {
    return NextResponse.json({ error: val.error }, { status: 400 });
  }

  const cleanDomain = val.cleanDomain;
  const isLk = cleanDomain.endsWith(".lk");
  const parts = cleanDomain.split(".");
  const tld = parts[parts.length - 1];
  const rootName = isLk
    ? cleanDomain.replace(/\.(com|org|edu|hotel|web|gov|sch|net)?\.?lk$/, "")
    : parts[0];

  try {
    const provider = getDomainProvider();
    const pricing = await getPricingForTld(tld, provider);

    // Multi-layer availability verification (DNS, DoH, RDAP, Provider)
    const checkRes = await provider.checkAvailability(cleanDomain);
    const isAvailable = checkRes.available;
    let providerNote = checkRes.note;

    // Strict white-labeling: strip internal provider codes, sandbox or auth notes, and local registry notes
    if (
      providerNote &&
      (providerNote.includes("[Code") ||
        providerNote.includes("Authentication error") ||
        providerNote.toLowerCase().includes("sandbox") ||
        providerNote.toLowerCase().includes("cloudflare") ||
        providerNote.toLowerCase().includes("lk nic") ||
        providerNote.toLowerCase().includes("local registry") ||
        providerNote.toLowerCase().includes("registrar provisioning"))
    ) {
      providerNote = undefined;
    }

    // Realtime Cloudflare Cost Sync: if provider returns a valid cost price, sync database
    if (checkRes.costPrice && checkRes.costPrice > 0) {
      if (Math.abs(checkRes.costPrice - pricing.regCost) > 0.001) {
        const liveCost = checkRes.costPrice;
        sql`
          UPDATE tld_pricing
          SET cost_price = ${liveCost},
              renewal_cost = ${liveCost},
              selling_price = ${liveCost} + markup,
              renewal_price = ${liveCost} + markup,
              updated_at = NOW()
          WHERE LOWER(tld) = LOWER(${tld})
        `.catch((e) => console.warn("[Cloudflare Realtime Price Sync Error]:", e));
        const markup = pricing.regRetail - pricing.regCost;
        pricing.regCost = liveCost;
        pricing.regRetail = parseFloat((liveCost + markup).toFixed(2));
        pricing.renewCost = liveCost;
        pricing.renewRetail = parseFloat((liveCost + markup).toFixed(2));
      }
    }

    // Build LK Registry Tiers with Frametoque markup (+LKR 500)
    let lkTiers: any = undefined;
    if (isLk && isAvailable) {
      const standardMarkup = 2000; // Fair profit: 2,000 LKR (Cost 8,000 -> Retail 10,000 LKR)
      const economyMarkup = 1500;  // Fair profit: 1,500 LKR (Cost 5,000 -> Retail 6,500 LKR)
      const budgetMarkup = 1000;   // Fair profit: 1,000 LKR (Cost 1,000 -> Retail 2,000 LKR)

      lkTiers = {
        standard: {
          domain: `${rootName}.lk`,
          package_type: "standard",
          title: "Standard",
          badge: "RECOMMENDED",
          cost_lkr: 8000,
          markup_lkr: standardMarkup,
          price_lkr: 8000 + standardMarkup,
          reserved_names: [
            `${rootName}.org.lk`,
            `${rootName}.edu.lk`,
            `${rootName}.com.lk`,
            `${rootName}.hotel.lk`,
            `${rootName}.web.lk`,
          ],
        },
        economy: {
          domain: `${rootName}.lk`,
          package_type: "economy",
          title: "Economy",
          cost_lkr: 5000,
          markup_lkr: economyMarkup,
          price_lkr: 5000 + economyMarkup,
        },
        second_level: [
          { domain: `${rootName}.com.lk`, cost_lkr: 1000, markup_lkr: budgetMarkup, price_lkr: 1000 + budgetMarkup },
          { domain: `${rootName}.edu.lk`, cost_lkr: 1000, markup_lkr: budgetMarkup, price_lkr: 1000 + budgetMarkup },
          { domain: `${rootName}.org.lk`, cost_lkr: 1000, markup_lkr: budgetMarkup, price_lkr: 1000 + budgetMarkup },
          { domain: `${rootName}.hotel.lk`, cost_lkr: 1000, markup_lkr: budgetMarkup, price_lkr: 1000 + budgetMarkup },
          { domain: `${rootName}.web.lk`, cost_lkr: 1000, markup_lkr: budgetMarkup, price_lkr: 1000 + budgetMarkup },
        ],
      };
    }

    // Generate verified multi-TLD suggestions including our standard extensions (.com, .net, .org, .io, .xyz)
    const candidateTlds = isLk
      ? ["com", "net", "org", "io", "xyz"]
      : ["com", "lk", "net", "org", "io", "xyz"].filter((sTld) => sTld !== tld);

    const suggestionPromises = candidateTlds.map(async (sTld) => {
      const sDomain = `${rootName}.${sTld}`;
      const sPricing = await getPricingForTld(sTld, provider);
      const availCheck = await verifyDomainAvailability(sDomain);
      return {
        domain: sDomain,
        available: availCheck.available,
        registrar: "Frametoque Digital",
        reg_cost_usd: sPricing.regCost,
        reg_price_usd: sPricing.regRetail,
        renew_cost_usd: sPricing.renewCost,
        renew_price_usd: sPricing.renewRetail,
      };
    });

    const suggestionsResults = await Promise.allSettled(suggestionPromises);
    const suggestions = suggestionsResults
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value)
      .filter((s) => s.available);

    return NextResponse.json({
      domain: cleanDomain,
      available: isAvailable,
      registrar: "Frametoque Digital",
      reg_cost_usd: pricing.regCost,
      reg_price_usd: pricing.regRetail,
      reg_profit_usd: parseFloat((pricing.regRetail - pricing.regCost).toFixed(2)),
      renew_cost_usd: pricing.renewCost,
      renew_price_usd: pricing.renewRetail,
      renew_profit_usd: parseFloat((pricing.renewRetail - pricing.renewCost).toFixed(2)),
      currency: "USD",
      note: providerNote,
      is_lk: isLk,
      lk_tiers: lkTiers,
      suggestions,
    });
  } catch (err: any) {
    console.error("Domain search check error:", err);
    return NextResponse.json({ error: "Failed to verify domain availability.", details: err.message }, { status: 500 });
  }
}
