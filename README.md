# Frametoque

Frametoque is an all-in-one digital agency platform and equipment rental management system. It provides public service showcases and rental catalogs, a self-service client portal for invoices, agreements, and domain management, and a comprehensive administrative dashboard for agency operations.

---

## 1. Stack & Architecture

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with React 19 and TypeScript
- **Styling**: Tailwind CSS v4, Framer Motion
- **Database**: PostgreSQL on Supabase (`postgres.js` client with Row Level Security)
- **Authentication**: [Clerk](https://clerk.com/) with role-based edge middleware and server action guards
- **Object Storage**: Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`)
- **Crypto & Data Protection**: AES-256-GCM application-level field encryption and HMAC-SHA256 blind indexing
- **Hosting Targets**:
  - Primary: Vercel Serverless (`sin1` Singapore region matching Supabase AWS Singapore database)
  - Secondary: Standalone Node.js server with PM2 process manager (`ecosystem.config.js`)

---

## 2. Prerequisites

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **Package Manager**: `pnpm >= 10.0.0`
- **PostgreSQL**: PostgreSQL 15+ database (Supabase recommended with pooling enabled)

---

## 3. Quick Start & Setup

### A. Clone and Install Dependencies
```bash
git clone https://github.com/nelithaofficial/frametoque.com.git
cd frametoque.com
pnpm install
```

### B. Environment Configuration
Copy the template and populate required runtime variables:
```bash
cp .env.example .env.local
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string with SSL (`sslmode=require`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication credentials
- `APP_FIELD_ENCRYPTION_KEY`: 64-character hex string (32 bytes) for AES-256-GCM vault encryption
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: Cloudflare R2 storage credentials
- `PAYMENTS_LK_SECRET_KEY` & `PAYMENTS_LK_WEBHOOK_SECRET`: Payment gateway integration

### C. Database Migrations
Database migrations are located in `scripts/*.sql`. Apply them sequentially using the Supabase SQL Editor or `psql`:
```bash
psql "$DATABASE_URL" -f scripts/enable-rls.sql
psql "$DATABASE_URL" -f scripts/migrate-domains-cloudflare.sql
psql "$DATABASE_URL" -f scripts/migrate-field-encryption-v2.sql
```

### D. Run Development Server
```bash
pnpm dev
```
The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 4. Available Scripts

| Command | Description |
|:---|:---|
| `pnpm dev` | Starts Next.js development server with Turbopack |
| `pnpm build` | Compiles an optimized production build via Webpack |
| `pnpm start` | Launches Next.js production server |
| `pnpm lint` | Runs ESLint 9 checks across all source files |
| `pnpm typecheck` | Runs TypeScript compiler checks without emitting files |
| `pnpm test` | Runs the full automated test suite (security + domain suites) |
| `pnpm test:security` | Runs CryptoVault and security regression tests (`scripts/security-tests.mjs`) |
| `pnpm test:domains` | Runs domain management unit and integration tests (`scripts/domain-tests.mjs`) |

---

## 5. Repository Layout

```text
├── .github/workflows/       # GitHub Actions CI/CD workflows
├── docs/runbooks/           # Security and operational incident runbooks
├── public/                  # Static assets (images, icons, documents)
├── scripts/                 # Production SQL migrations and automated test suites
│   ├── backfill-field-encryption.mjs
│   ├── domain-tests.mjs
│   ├── enable-rls.sql
│   ├── migrate-domains-cloudflare.sql
│   ├── migrate-field-encryption-v2.sql
│   └── security-tests.mjs
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication callback and login flows
│   │   ├── (dashboard)/     # Client portal (/dashboard) and Admin panel (/admin)
│   │   ├── (landing)/       # Public marketing pages and project portfolio
│   │   ├── (legal)/         # Privacy policy, terms, and cookie notices
│   │   ├── (seo)/           # Dynamic robots.txt and sitemap handlers
│   │   ├── api/             # REST API endpoints, webhooks, and cron jobs
│   │   ├── rentals/         # Equipment rental catalog and detail pages
│   │   ├── error.tsx        # Global production error boundary
│   │   ├── layout.tsx       # Root HTML shell and provider wrappers
│   │   └── not-found.tsx    # Branded global 404 handler
│   ├── components/          # Reusable React UI components
│   ├── context/             # Global client state (CartContext, etc.)
│   └── lib/                 # Core utilities, database client, and security vault
│       ├── auth-guard.ts    # Role-based authorization helpers
│       ├── crypto-vault.ts  # AES-256-GCM encryption & HMAC blind index engine
│       ├── db.ts            # Supabase PostgreSQL singleton client
│       ├── env.ts           # Production environment startup validator
│       ├── logger.ts        # System audit action logging to PostgreSQL
│       └── storage.ts       # Cloudflare R2 object storage interface
├── DEPLOYMENT.md            # Detailed Vercel & shared hosting deployment manual
├── PERFORMANCE.md           # Performance budgets, bundles, and diagnostic guides
└── SECURITY.md              # Security policies, disclosure guidelines, and controls
```

---

## 6. Security & Documentation Links

- [Security Policy & Vulnerability Disclosure](SECURITY.md)
- [Deployment & Portability Guide](DEPLOYMENT.md)
- [Performance & Resource Monitoring](PERFORMANCE.md)
- Incident Response Runbooks:
  - [Credential Leak Response](docs/runbooks/credential-leak.md)
  - [Database Compromise Response](docs/runbooks/database-compromise.md)
  - [Encryption Key Compromise](docs/runbooks/encryption-key-compromise.md)
  - [Ransomware & Extortion Defense](docs/runbooks/ransomware-extortion.md)
  - [Third-Party Breach Response](docs/runbooks/third-party-breach.md)
