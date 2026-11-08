# Deployment & Portability Guide (Vercel & Shared Hosting)

This codebase is engineered to run seamlessly across two target environments:
1. **Vercel** (Serverless, CDN edge, automatic deployments)
2. **Shared Hosting** (cPanel / CloudLinux Passenger, single long-lived Node.js process)

---

## 1. Vercel Deployment (Current Target)

### Region & Latency Configuration
- Configured in `vercel.json` with `"regions": ["sin1"]` (Singapore) to match the Supabase PostgreSQL database located in AWS Singapore (`ap-southeast-1`).
- Eliminates 220–250ms cross-continental network round trips per database query.

### Deployment Retention Settings (Crucial for Functions Storage)
To prevent Functions Storage from exceeding the 10 GB limit:
1. Open **Vercel Dashboard → frametoque-main → Settings → Data Cache & Deployment Retention**.
2. Set **Preview Deployment Retention** to **7 days** (or 14 days).
3. In the **Deployments** tab, prune old preview/test deployments that are no longer active.
4. Set **Functions Storage Alert** in Vercel to notify at 70% and 85%.

### Production Environment Variables on Vercel
Ensure the following variables are configured in **Vercel Dashboard → Settings → Environment Variables**:
- `DATABASE_URL` / `POSTGRES_URL` (Supabase pooled connection string with `?sslmode=require`)
- `DB_POOL_MAX` (Default: `10`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`
- `APP_FIELD_ENCRYPTION_KEY` & `CREDENTIALS_ENCRYPTION_KEY` (32-byte hex)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL`
- `STORAGE_PROVIDER="r2"`
- `CRON_SECRET` (32+ chars high entropy)
- `UMAMI_URL`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `UMAMI_USERNAME`, `UMAMI_PASSWORD`
- `PAYMENTS_LK_SECRET_KEY`, `PAYMENTS_LK_WEBHOOK_SECRET`

---

## 2. Shared Hosting Deployment (cPanel / Passenger / VPS)

### Shared Host Requirements Checklist
Before moving to a shared host, confirm the host provides:
- [x] **Node.js 20+** support in cPanel "Setup Node.js App" (CloudLinux Passenger or PM2).
- [x] Memory limit of at least **512 MB** (1 GB or 2 GB recommended). The app idle RSS is ~103 MB, peak is ~176 MB.
- [x] Outbound TCP connections on port **443** (HTTPS) and port **6543/5432** (PostgreSQL).
- [x] **cPanel Cron** access to schedule background jobs via `curl`.
- [x] Free SSL (Let's Encrypt / AutoSSL).

---

### Step-by-Step Deployment Procedure

#### Step 1: Build the Standalone Package Locally or in CI
Never run `pnpm build` on a shared hosting server, as shared environments lack the RAM and CPU to compile Next.js.
```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Run standalone production build
pnpm run build:standalone
```

Next.js will generate a self-contained standalone bundle inside `.next/standalone`.

#### Step 2: Assemble the Release Folder
Create a clean directory containing only the standalone files:
```bash
# Prepare release structure
mkdir -p release-deploy
cp -r .next/standalone/* release-deploy/
mkdir -p release-deploy/.next
cp -r .next/static release-deploy/.next/
cp -r public release-deploy/
cp server.js release-deploy/
cp ecosystem.config.js release-deploy/ 2>/dev/null || true
```
*Note: Inode count is kept minimal because `node_modules` in `.next/standalone` contains only traced production dependencies.*

#### Step 3: Upload to Shared Hosting
1. Compress `release-deploy` into `deploy.zip`.
2. In cPanel **File Manager**, create a folder outside public_html, e.g. `/home/username/frametoque-app`.
3. Upload and extract `deploy.zip` into `/home/username/frametoque-app`.

#### Step 4: Configure Node.js App in cPanel
1. Open cPanel → **Setup Node.js App** → **Create Application**.
2. **Node.js version**: Choose `20.x` or latest LTS.
3. **Application mode**: `Production`.
4. **Application root**: `frametoque-app`.
5. **Application URL**: `frametoque.com` (or your subdomain).
6. **Application startup file**: `server.js`.
7. **Environment variables**: Add all production variables listed above. Set:
   - `NODE_ENV=production`
   - `PORT=3000` (or assigned by Passenger)
   - `DB_POOL_MAX=5` (keeps connection count strictly within shared hosting limits)
   - `STORAGE_PROVIDER=r2`
   - `NEXT_PUBLIC_PREFER_R2=true`
8. Click **Save** and then **Restart**.

#### Step 5: Configure Scheduled Jobs (cPanel Cron)
In cPanel → **Cron Jobs**, configure the daily domain sync:
- **Frequency**: Once per day (`0 0 * * *`)
- **Command**:
  ```bash
  curl -s -X GET "https://frametoque.com/api/cron/domain-sync" -H "Authorization: Bearer YOUR_CRON_SECRET" >/dev/null 2>&1
  ```

To trigger scheduled social media publishing:
- **Frequency**: Every 15 minutes (`*/15 * * * *`)
- **Command**:
  ```bash
  curl -s -X GET "https://frametoque.com/api/cron/social-publisher" -H "Authorization: Bearer YOUR_CRON_SECRET" >/dev/null 2>&1
  ```

---

### Cloudflare CDN Caching Rules (Recommended for Shared Hosting)
Placing Cloudflare (free tier) in front of the shared hosting server provides edge acceleration and DDoS protection:
1. **Cache Everything for Static Chunks**:
   - URL Match: `frametoque.com/_next/static/*`
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month
2. **Cache Media & Public Assets**:
   - URL Match: `frametoque.com/logos/*`, `frametoque.com/images/*`, `frametoque.com/favicon*`
   - Edge Cache TTL: 7 days
3. **Bypass Cache for Protected Routes (CRITICAL)**:
   - URL Match: `frametoque.com/admin*`, `frametoque.com/dashboard*`, `frametoque.com/api/*`
   - Cache Level: Bypass

---

### Instant Rollback Strategy
Keep the previous build folder on the server:
```bash
/home/username/releases/v1/
/home/username/releases/v2/
/home/username/frametoque-app -> symlink to /home/username/releases/v2
```
If a regression occurs, switch the symlink back to `v1` and click **Restart Application** in cPanel.

---

### Health Check Endpoint
A zero-cost health check endpoint is available for uptime monitors:
- **URL**: `GET /api/health`
- **Response**: `{ "status": "healthy", "service": "frametoque-web", "uptime": 1234 }`

