# Cloudflare Domain Reselling Control Center

A unified, self-service domain reselling control center integrated directly into both the Client Dashboard and Admin Dashboard, powered by the Cloudflare Registrar & DNS APIs.

---

## 1. Environment Configuration

Add the following environment variables to your `.env.local` (or production environment settings). Refer to `.env.example`:

```bash
# Cloudflare Registrar & DNS API
CLOUDFLARE_ENV="sandbox" # "sandbox" | "production" (defaults to sandbox in development)
CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"
CLOUDFLARE_ACCOUNT_ID="your_32_char_cloudflare_account_id"
CLOUDFLARE_BASE_URL="https://api.cloudflare.com/client/v4"
```

### Required Cloudflare API Token Permissions:
* **Account** -> **Zone** -> **Create**: Grants `com.cloudflare.api.account.zone.create` to create DNS zones
* **Account** -> **Registrar**: Read & Write (or **Registrar Sandbox** for test mode)
* **Zone** -> **Zone**: Read & Write
* **Zone** -> **DNS**: Read & Write
* **Zone** -> **DNSSEC**: Read & Write

### Official Cloudflare Registrar & Sandbox Endpoints Used:
* **Domain Search**: `GET /accounts/{account_id}/{registrar|registrar-sandbox}/domain-search?q={keyword}`
* **Domain Availability Check**: `POST /accounts/{account_id}/{registrar|registrar-sandbox}/domain-check` with `{ domains: [domain_name] }`
* **Registrations (Create)**: `POST /accounts/{account_id}/{registrar|registrar-sandbox}/registrations`
* **Registration Details (Get)**: `GET /accounts/{account_id}/{registrar|registrar-sandbox}/registrations/{domain_name}`
* **Registration Updates (Lock, Auto-renew, Privacy)**: `PATCH /accounts/{account_id}/{registrar|registrar-sandbox}/registrations/{domain_name}`
* **Transfer In**: `POST /accounts/{account_id}/{registrar}/registrations/{domain_name}/transfer-in`
* **DNS Zones**: `GET /zones?name={domain}` and `POST /zones`
* **DNS Records**: `GET /zones/{zone_id}/dns_records` and `POST/PATCH/DELETE /zones/{zone_id}/dns_records/{record_id}`
* **DNSSEC**: `GET /zones/{zone_id}/dnssec` and `PATCH /zones/{zone_id}/dnssec`

### Switching From Sandbox to Production:
1. Switch `CLOUDFLARE_ENV="production"` in your `.env.local` / environment variables.
2. Ensure `ALLOW_LIVE_DOMAIN_PURCHASES="true"` is set to unlock actual credit card registrations.
3. In production mode, domain checks query Cloudflare's live registry pricing (`/registrar/domain-check`), domain purchases execute real ICANN registrations, and DNS zones are automatically published live across Cloudflare's Anycast edge network.
4. In sandbox mode (`CLOUDFLARE_ENV="sandbox"`), purchases route to `/registrar-sandbox/` and never charge your connected credit card. Test registrations are persisted within the Cloudflare Sandbox environment.

---

## 2. Architecture & Provider Adapter

All communication with Cloudflare occurs strictly on the server-side (`src/lib/domains/provider.ts`). Credentials and API tokens are never exposed to the browser.

* **Provider Interface (`DomainProvider`)**:
  * `checkAvailability(domain)`: Queries registry availability and pricing.
  * `searchDomains(query, limit)`: Returns domain suggestions across popular TLDs.
  * `registerDomain(req)`: Executes domain registration with contact payloads.
  * `getDomain(domain)`: Fetches live registration and lock status.
  * `setLock(domain, locked)`: Toggles ICANN registrar transfer lock.
  * `setAutoRenew(domain, autoRenew)`: Toggles domain auto-renewal.
  * `updateContacts(domain, contacts)`: Syncs registrant contact details.
  * `initiateInboundTransfer(req)`: Ingests external domain with Auth/EPP code.
  * `requestOutboundTransfer(domain)`: Unlocks domain and initiates EPP code dispatch.
  * `getOrCreateZone(domain)`: Finds or provisions a Cloudflare DNS Zone.
  * `listDnsRecords(zoneId)` / `createDnsRecord(...)` / `updateDnsRecord(...)` / `deleteDnsRecord(...)`: Full DNS record management.
  * `getDnssec(zoneId)` / `setDnssec(zoneId, enabled)`: DNSSEC cryptographic signing and DS record generation.
  * `getNameservers(zoneId)` / `setCustomNameservers(...)`: Nameserver policies.

* **Audit Logging (`src/lib/domains/audit.ts`)**:
  Every registration, DNS modification, lock change, contact update, and transfer attempt logs an entry into the `domain_audit_log` table, recording `user_email`, `domain_name`, `action`, `details` JSONB, and client `ip_address`.

* **Authorization & IDOR Protection (`src/lib/domains/auth.ts`)**:
  Every client-facing endpoint verifies that the authenticated Clerk user matches `domain.client_email` before any lookup or mutation. Admin sessions bypass ownership checks to manage domains on behalf of clients.

* **Input Validation & Rate Limiting (`src/lib/domains/validation.ts`)**:
  Strict regex validation for domain formats, IP addresses (A/AAAA), and MX priorities. Built-in sliding-window rate limiting prevents endpoint abuse.

---

## 3. Database Schema & Auto-Migrations

Automatic schema migrations run on startup (`src/lib/domains/migration.ts`):

1. **Extended `admin_domain_orders` Table**:
   * `zone_id`: Cloudflare DNS Zone ID.
   * `locked`: Registrar transfer lock status.
   * `auto_renew`: Auto-renewal flag.
   * `privacy_enabled`: WHOIS redaction flag.
   * `nameservers`: Array of active nameservers.
   * `registrant_contacts`: JSONB contact information.
   * `transfer_status`: Status of transfers (`none`, `transfer_pending`, `outbound_requested`).
   * `dnssec_status`: Status of DNSSEC (`active`, `disabled`).
   * `cloudflare_sync_at`: Timestamp of latest Cloudflare synchronization.

2. **`domain_audit_log` Table**:
   * Tracks all user and administrative domain operations.

3. **`tld_pricing` Table**:
   * Stores cost price, markup, selling price, and renewal pricing per extension.

---

## 4. Client Dashboard Features (`/dashboard/domains`)

* **Portfolio View**: Filter by status (All, Active, Pending, Expired), search by domain name, view registration and renewal prices with locked LKR conversions, and track expiration warnings (with "Expiring in X days" alerts).
* **Search & Registration**: Live domain search across multiple TLDs (.com, .lk, .net, .org, .io, .xyz), instant availability, retail rates, and "Buy Domain" or "Add to Cart" checkout options.
* **Domain Control Center**:
  * **DNS Record Editor**: Add, edit, and delete A, AAAA, CNAME, TXT, MX, SRV records with TTL select, Cloudflare proxy toggle (CDN/WAF), and quick 1-click templates for Google Workspace, Zoho Mail, Vercel, and GitHub Pages.
  * **Nameserver Management**: Inspect assigned Cloudflare Anycast nameservers.
  * **Security & DNSSEC**: Toggle Registrar Lock, review permanent WHOIS Privacy status, and activate/deactivate DNSSEC with full DS record inspection (Key Tag, Algorithm, Digest, DS string).
  * **Registrant Contacts**: View and edit Registrant, Admin, Technical, and Billing contact details, synced to Cloudflare.
  * **Transfer Center**: Inbound domain transfers with Auth/EPP codes; outbound unlock and transfer-out request flow.
  * **Invoices & Receipts**: View linked invoice, pay online, or upload local bank-transfer slips via PayModal.
  * **Add-ons**: Order professional business email mailboxes and dedicated SSL certificates.

---

## 5. Admin Dashboard Features (`/admin/web-services/domains`)

* **Global Portfolio**: Manage all domains across all clients with search, status filters, TLD extension filters, and "Expiring Soon (&le;30d)" filter.
* **Control Center on Behalf of Client**: Open the full Cloudflare Control Center modal on any domain to configure DNS records, security, contacts, or nameservers.
* **Live Cloudflare Sync**: Single-domain or bulk sync button to fetch live statuses, expiry dates, lock states, and zone IDs from Cloudflare API.
* **Manual Provisioning**: One-click registration for pending domain orders that triggers the Cloudflare registration workflow and generates the DNS zone.
* **TLD Pricing Manager**: Customize cost price, retail markup, and renewal pricing per extension.
* **Operations Audit Trail**: Inspect full historical audit logs with user IDs, timestamps, and IP addresses.
* **Automated Cron Sync (`/api/cron/domain-sync`)**: Automatically expires overdue domains and triggers expiration notices at 30, 14, and 7 days. Configured in `vercel.json`.

---

## 6. Features Not Supported via Cloudflare API

Per Cloudflare official documentation, the following operations are not supported by the Cloudflare Registrar API:

1. **Arbitrary External Nameservers**:
   * *Reason*: Cloudflare Registrar domains are tightly bound to Cloudflare's Anycast infrastructure and require Cloudflare authoritative nameservers. External third-party nameservers cannot be configured without transferring the domain out.
   * *Handling*: Marked in the UI as **"Enforced by Cloudflare Registrar (Cloudflare Authoritative NS required; Custom vanity hostnames require Business plan)"**.
2. **WHOIS Privacy Toggle**:
   * *Reason*: Cloudflare provides WHOIS privacy automatically and for free on all registrar domains per ICANN policy and does not permit unmasking personal details.
   * *Handling*: Permanently displayed as **"Enabled, powered by Cloudflare"**.
3. **Unsupported ccTLDs (e.g. `.lk`)**:
   * *Reason*: Cloudflare Registrar does not support national ccTLDs like `.lk`.
   * *Handling*: Handled via local registry adapter (LK NIC) and flagged in the UI as **"Manual Provisioning (Local Registry LK NIC)"**.
4. **Outbound Transfer Auth/EPP Code via API**:
   * *Reason*: For security, Cloudflare allows unlocking the domain via API, but requires the authorization code to be retrieved directly from the dashboard or sent securely to the registrant.
   * *Handling*: Client UI provides **"Unlock & Request Transfer Code"**, which unlocks the domain, generates an audit log, and notifies administrators/client.

---

## 7. Running Unit Tests

Run the domain reselling test suite:

```bash
pnpm run test:domains
# or
node --test scripts/domain-tests.mjs
```

All 12 tests verify input validation, rate limiting, provider adapter sandbox mode, mock HTTP responses, and ownership IDOR prevention.

