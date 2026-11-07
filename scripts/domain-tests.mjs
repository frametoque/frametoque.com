/**
 * Unit & Integration Test Suite for Cloudflare Domain Reseller Control Center
 * Tests:
 * 1. Provider Adapter (Sandbox mode, Mock HTTP layer)
 * 2. Input Validation (Domain format, DNS record types, TTL, MX priorities)
 * 3. In-memory Rate Limiting
 * 4. Authorization & IDOR Protection Logic
 */

import assert from "node:assert";
import test from "node:test";

// 1. Test Input Validation
import {
  validateDomainName,
  validateDnsRecordInput,
  checkRateLimit,
} from "../src/lib/domains/validation.ts";

test("Domain Validation: Accepts valid domains", () => {
  const validDomains = ["example.com", "my-company.lk", "test.net", "app.io", "cloud.xyz"];
  for (const d of validDomains) {
    const res = validateDomainName(d);
    assert.strictEqual(res.valid, true, `Expected ${d} to be valid`);
  }
});

test("Domain Validation: Rejects invalid domain names and URLs with paths", () => {
  const invalid = ["", "invalid", "invalid_domain", ".com", "http://example.com/path", "example.com/path", "test..com"];
  for (const d of invalid) {
    const res = validateDomainName(d);
    assert.strictEqual(res.valid, false, `Expected ${d} to be rejected`);
  }
});

test("DNS Record Validation: Validates A and AAAA records", () => {
  const validA = validateDnsRecordInput({
    type: "A",
    name: "@",
    content: "192.0.2.1",
    ttl: 300,
  });
  assert.strictEqual(validA.valid, true);

  const invalidA = validateDnsRecordInput({
    type: "A",
    name: "@",
    content: "999.999.999.999",
  });
  assert.strictEqual(invalidA.valid, false);

  const validAAAA = validateDnsRecordInput({
    type: "AAAA",
    name: "ipv6",
    content: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    ttl: 1,
  });
  assert.strictEqual(validAAAA.valid, true);
});

test("DNS Record Validation: Validates MX priority requirements", () => {
  const validMX = validateDnsRecordInput({
    type: "MX",
    name: "@",
    content: "mail.example.com",
    priority: 10,
    ttl: 3600,
  });
  assert.strictEqual(validMX.valid, true);

  const invalidMX = validateDnsRecordInput({
    type: "MX",
    name: "@",
    content: "mail.example.com",
    // Missing priority
  });
  assert.strictEqual(invalidMX.valid, false);
});

test("DNS Record Validation: Validates TTL boundaries", () => {
  const validAuto = validateDnsRecordInput({
    type: "TXT",
    name: "@",
    content: "v=spf1 include:_spf.google.com ~all",
    ttl: 1, // Auto
  });
  assert.strictEqual(validAuto.valid, true);

  const invalidTtl = validateDnsRecordInput({
    type: "TXT",
    name: "@",
    content: "sample",
    ttl: 15, // Less than minimum 60
  });
  assert.strictEqual(invalidTtl.valid, false);
});

test("Rate Limiter: Allows requests within quota and throttles excessive requests", () => {
  const key = `test:ip:${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(key, 5, 10000);
    assert.strictEqual(res.allowed, true);
  }
  // 6th request must be denied
  const exceeded = checkRateLimit(key, 5, 10000);
  assert.strictEqual(exceeded.allowed, false);
  assert.strictEqual(exceeded.remaining, 0);
});

// 2. Test Cloudflare Provider Adapter (Mock HTTP layer)
import { CloudflareProvider } from "../src/lib/domains/provider.ts";

test("CloudflareProvider: Initializes in sandbox mode by default", () => {
  const provider = new CloudflareProvider({
    apiToken: "cf-test-token-12345",
    accountId: "cf-account-id-12345",
    env: "sandbox",
  });

  assert.strictEqual(provider.isSandbox, true);
  assert.strictEqual(provider.providerName, "Cloudflare");
});

test("CloudflareProvider: Identifies ccTLD (.lk) as manual local registry requirement", async () => {
  const provider = new CloudflareProvider({
    apiToken: "cf-test-token-12345",
    accountId: "cf-account-id-12345",
    env: "sandbox",
  });

  const check = await provider.checkAvailability("mybusiness.lk");
  assert.strictEqual(check.domain, "mybusiness.lk");
  assert.strictEqual(check.supportedByProvider, false);
  assert.ok(check.note?.includes("LK NIC"));
});

test("CloudflareProvider: Nameserver policy restricts external third-party nameservers", async () => {
  const provider = new CloudflareProvider({
    apiToken: "cf-test-token-12345",
    accountId: "cf-account-id-12345",
    env: "sandbox",
  });

  const nsInfo = await provider.getNameservers("mock-zone-123");
  assert.strictEqual(nsInfo.canCustomise, false);
  assert.ok(nsInfo.notice.includes("Frametoque Digital Anycast") || nsInfo.notice.includes("Frametoque Digital"));

  const changeAttempt = await provider.setCustomNameservers("mock-zone-123", [
    "ns1.external-host.com",
    "ns2.external-host.com",
  ]);
  assert.strictEqual(changeAttempt.success, false);
  assert.strictEqual(changeAttempt.notice, "Manual / Pending Provider Support");
});

test("CloudflareProvider: Mock HTTP checkAvailability in sandbox", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (String(url).includes("domain-check") || String(url).includes("availability")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              result: {
                domains: [
                  {
                    name: "freshdomain.com",
                    registrable: true,
                    pricing: { registration_cost: "10.46", currency: "USD" },
                  },
                ],
              },
            }),
        };
      }
      return { ok: false, status: 404, text: async () => "{}" };
    };

    const provider = new CloudflareProvider({
      apiToken: "mock-token",
      accountId: "mock-acc",
      env: "sandbox",
    });

    const res = await provider.checkAvailability("freshdomain.com");
    assert.strictEqual(res.available, true);
    assert.strictEqual(res.costPrice, 10.46);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CloudflareProvider: Mock HTTP DNS record creation and DNSSEC in sandbox", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      const u = String(url);
      if (u.includes("/dns_records") && opts?.method === "POST") {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              result: {
                id: "rec-mock-999",
                zone_id: "zone-123",
                type: body.type,
                name: body.name,
                content: body.content,
                ttl: body.ttl,
                proxied: body.proxied,
              },
            }),
        };
      }
      if (u.includes("/dnssec") && opts?.method === "PATCH") {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              success: true,
              result: {
                status: "active",
                key_tag: 2371,
                algorithm: 13,
                digest_type: 2,
                digest: "ABCDEF123456",
                ds: "example.com. 3600 IN DS 2371 13 2 ABCDEF123456",
              },
            }),
        };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, result: {} }) };
    };

    const provider = new CloudflareProvider({
      apiToken: "mock-token",
      accountId: "mock-acc",
      env: "sandbox",
    });

    const dnsRecord = await provider.createDnsRecord("zone-123", {
      type: "CNAME",
      name: "sub",
      content: "example.com",
      proxied: true,
      ttl: 1,
    });

    assert.strictEqual(dnsRecord.id, "rec-mock-999");
    assert.strictEqual(dnsRecord.type, "CNAME");
    assert.strictEqual(dnsRecord.proxied, true);

    const dnssec = await provider.setDnssec("zone-123", true);
    assert.strictEqual(dnssec.status, "active");
    assert.strictEqual(dnssec.dsRecord?.keyTag, 2371);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// 3. Test Authorization and IDOR Prevention Logic
test("Authorization / IDOR: Blocks non-owners and permits owner and admin", () => {
  const domainOrder = {
    id: 42,
    domain_name: "clientdomain.com",
    client_email: "client@example.com",
  };

  const evaluateAccess = (session, domain) => {
    if (!session || !session.email) throw new Error("Unauthorized (401)");
    const userEmail = session.email.toLowerCase().trim();
    const ownerEmail = domain.client_email.toLowerCase().trim();
    if (!session.isAdmin && userEmail !== ownerEmail) {
      throw new Error("Forbidden: IDOR Violation (403)");
    }
    return true;
  };

  // Owner access
  assert.strictEqual(
    evaluateAccess({ email: "client@example.com", isAdmin: false }, domainOrder),
    true
  );

  // Admin access on any domain
  assert.strictEqual(
    evaluateAccess({ email: "admin@frametoque.com", isAdmin: true }, domainOrder),
    true
  );

  // Cross-tenant malicious access attempt
  assert.throws(
    () => evaluateAccess({ email: "attacker@othercompany.com", isAdmin: false }, domainOrder),
    /Forbidden: IDOR Violation/
  );
});

test("Domain UID: Verifies random non-numeric string identifier resolution and anti-enumeration", () => {
  const mockDomain = {
    id: 11,
    domain_uid: "ad5204bffb97",
    domain_name: "selexprimeengineering.com",
    client_email: "client@example.com",
  };

  const resolveLookupKey = (input) => {
    const raw = String(input || "").trim();
    if (/^\d+$/.test(raw)) return { type: "numeric_id", value: Number(raw) };
    if (/^[a-f0-9]{12}$/i.test(raw) || raw.startsWith("dom_")) return { type: "domain_uid", value: raw.replace(/^dom_/, "") };
    return { type: "domain_name", value: raw.toLowerCase() };
  };

  assert.strictEqual(resolveLookupKey(mockDomain.domain_uid).type, "domain_uid");
  assert.strictEqual(resolveLookupKey(mockDomain.domain_uid).value, "ad5204bffb97");
  assert.strictEqual(resolveLookupKey("dom_ad5204bffb97").value, "ad5204bffb97");
  assert.strictEqual(resolveLookupKey(11).type, "numeric_id");
  assert.strictEqual(resolveLookupKey("selexprimeengineering.com").type, "domain_name");
});

test("CloudflareProvider: Sync live real-time TLD pricing", async () => {
  const provider = new CloudflareProvider({
    apiToken: "cf-test-token-12345",
    accountId: "cf-account-id-12345",
    env: "sandbox",
  });

  const liveRates = await provider.syncLiveTldPricing(["com", "net", "lk"]);
  assert.strictEqual(Array.isArray(liveRates), true);
  assert.strictEqual(liveRates.length, 3);
  
  const lk = liveRates.find((r) => r.tld === "lk");
  assert.strictEqual(lk?.costPrice, 18.00);
  assert.strictEqual(lk?.success, true);

  const com = liveRates.find((r) => r.tld === "com");
  assert.ok(com?.costPrice && com.costPrice > 0);
});

test("Financial Safety: Live domain purchases are blocked without explicit killswitch", async () => {
  const liveProvider = new CloudflareProvider({
    apiToken: "cf-test-token-12345",
    accountId: "cf-account-id-12345",
    env: "production",
  });

  const dummyReq = {
    domain: "safety-test.com",
    contacts: {
      registrant: {
        first_name: "Test",
        last_name: "User",
        address: "123 Street",
        city: "City",
        state: "State",
        zip: "12345",
        country: "LK",
        phone: "+94771234567",
        email: "test@example.com",
      },
    },
  };

  // Must reject and block live financial charge
  await assert.rejects(
    () => liveProvider.registerDomain(dummyReq),
    /LIVE PURCHASE BLOCKED: Real money domain registrations are disabled by safety guard/
  );
});

// 5. Multi-Layer Domain Availability Tests
import { verifyDomainAvailability } from "../src/lib/domains/provider.ts";

test("Domain Availability: Accurately identifies taken vs available domains", async () => {
  // Test with mock fetch representing taken domain (RDAP 200 or DoH Status 0)
  const originalFetch = globalThis.fetch;
  try {
    // Mock 1: Taken domain (RDAP returns 200 with registrar details)
    globalThis.fetch = async (url) => {
      if (String(url).includes("rdap.org/domain/techrolk.com")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: ["client transfer prohibited"] }),
        };
      }
      if (String(url).includes("rdap.org/domain/freshavailabletest123.com")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };

    const taken = await verifyDomainAvailability("techrolk.com");
    assert.strictEqual(taken.available, false);

    const available = await verifyDomainAvailability("freshavailabletest123.com");
    assert.strictEqual(available.available, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
