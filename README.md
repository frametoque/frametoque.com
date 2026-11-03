# Frametoque Engineering Platform

Frametoque is a full-stack media production and digital engineering management platform built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, and PostgreSQL.

---

## 1. Architecture Overview

- **Frontend & Web Application**: Next.js 15 App Router with server-rendered public portfolio pages, responsive client administration panels, and dynamic invoice generation.
- **Authentication & RBAC**: Clerk authentication with server-side session verification, role-based authorization guards (`src/lib/auth-guard.ts`), and strict path-level route protection.
- **Database & Persistence**: PostgreSQL (Supabase Connection Pooler) accessed via authenticated queries with application-level cryptographic protections.
- **Storage Infrastructure**: Primary object storage hosted on Cloudflare R2 (`src/lib/storage/r2-client.ts`) with fallback handling for Vercel Blob storage (`src/lib/storage/blob-client.ts`).
- **Security & Cryptography**: AES-256-GCM envelope encryption with unique IVs, associated authenticated data (AAD) context binding, and HMAC-SHA256 blind indexing for searchable ciphertext (`src/lib/crypto-vault.ts`).

---

## 2. Technical Stack & Prerequisites

- **Runtime**: Node.js `>= 20.0.0`
- **Package Manager**: `pnpm` (lockfile: `pnpm-lock.yaml`)
- **Framework**: Next.js 15.x (React 19)
- **Styling**: Tailwind CSS v4 (`@theme` via CSS variables)
- **Database**: PostgreSQL 15+ (Hosted on Supabase AWS Singapore)
- **Authentication**: Clerk

---

## 3. Environment Configuration

Copy the template configuration to create your local `.env`:

```bash
cp .env.example .env.local
```

Refer to `.env.example` for comprehensive definitions of all required and optional environment variables:
- `DATABASE_URL` / `POSTGRES_URL`: PostgreSQL connection string with SSL enforcement (`sslmode=require`).
- `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk authentication keys.
- `APP_FIELD_ENCRYPTION_KEY`: 32-byte hexadecimal key for AES-256-GCM field encryption.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: Cloudflare R2 credentials.
- `CRON_SECRET` & `CALENDAR_FEED_SECRET`: High-entropy secrets for background workers and calendar feeds.

Startup environment validation is executed via `src/lib/env.ts` during production runtime to fail fast if required secrets are missing.

---

## 4. Development & Build Commands

```bash
# Install dependencies strictly from lockfile
pnpm install --frozen-lockfile

# Run local development server
pnpm dev

# Run security and cryptographic regression test suite
pnpm test

# Run TypeScript type verification
pnpm typecheck

# Run production build
pnpm build

# Start production server
pnpm start
```

---

## 5. Security & Cryptographic Vault

All personally identifiable information (PII) and financial records are protected using application-level AES-256-GCM encryption before persistence:
- **Encrypted Tables & Fields**:
  - `admin_clients`: `email`, `phone`, `company`
  - `admin_invoices`: `client_email`
  - `admin_quotations`: `client_email`
  - `admin_agreements`: `client_sig_image`
- **Searchable Encryption**: Exact-match searching is performed using HMAC-SHA256 blind index columns (e.g. `email_bidx`, `phone_bidx`).
- **Migration & Backfill Utilities**:
  - SQL Schema: `scripts/migrate-field-encryption.sql`
  - Backfill Script: `scripts/backfill-field-encryption.mjs`

---

## 6. Operational Runbooks & Documentation

Operational procedures and security policies are maintained in the repository:
- Security Policy & Disclosure: `SECURITY.md`
- Backup & Disaster Recovery: `docs/security/backup-and-recovery.md`
- Incident Response Plan: `docs/security/incident-response.md`
- Cryptographic Key Rotation: `docs/security/key-rotation.md`
- Security Monitoring & Alerting: `docs/security/monitoring-and-alerts.md`
- Secret Leakage Remediation: `docs/security/secret-leakage.md`

---

## 7. Health & Monitoring Endpoints

- **Health Check**: `GET /api/health`
  - Returns `{"status":"healthy","service":"frametoque-web",...}`
  - Designed for AWS ALB / EC2 target groups and container orchestrators.
- **Robots Policy**: `GET /robots.txt`
  - Allows public crawling of portfolio and landing routes.
  - Strictly disallows crawling of `/admin`, `/dashboard`, and `/api/*`.
