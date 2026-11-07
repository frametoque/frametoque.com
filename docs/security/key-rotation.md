# Key Rotation Runbook

This guide details the procedure for rotating encryption keys, database passwords, and third-party API tokens without service interruption.

---

## 1. Field Encryption Key Rotation (`APP_FIELD_ENCRYPTION_KEY`)

The application-level encryption vault stores ciphertexts prefixed with version identifiers (`v1:iv:tag:data`). When rotating the Master Key:

### Step 1: Generate New Key
Generate a cryptographically secure 256-bit key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Configure Secondary Key
1. Set the new key in your server environment as `APP_FIELD_ENCRYPTION_KEY_V2`.
2. Keep the current key as `APP_FIELD_ENCRYPTION_KEY_V1` (or primary).
3. The application will use `V2` for all new encryptions, while decrypting existing records using `V1` based on the version header.

### Step 3: Run Re-encryption Migration
Execute the re-encryption script during a scheduled maintenance window:
```bash
node scripts/backfill-field-encryption.mjs --re-encrypt --from-v1 --to-v2
```

### Step 4: Decommission Old Key
Once all database rows verify with the `v2` prefix, remove `APP_FIELD_ENCRYPTION_KEY_V1` from production environment variables.

---

## 2. Rotating Credentials Vault Secret (`CREDENTIALS_ENCRYPTION_KEY`)

The site credentials vault (`admin_site_credentials`) uses `CREDENTIALS_ENCRYPTION_KEY`.
1. Deploy new key to environment:
   ```bash
   CREDENTIALS_ENCRYPTION_KEY="<new_64_char_hex_string>"
   ```
2. Trigger the automated re-encryption helper to cycle existing credential rows.

---

## 3. Rotating Third-Party Secrets

### Clerk Secret Key (`CLERK_SECRET_KEY`)
1. Log in to Clerk Dashboard -> API Keys.
2. Generate a new Secret Key.
3. Update server `.env` with the new key.
4. Restart the Next.js process: `pm2 reload frametoque`.
5. Revoke the old key in the Clerk Dashboard.

### Cloudflare R2 Credentials (`R2_ACCESS_KEY_ID` & `R2_SECRET_ACCESS_KEY`)
1. Log in to Cloudflare Dashboard -> R2 -> Manage R2 API Tokens.
2. Create a new token with Read & Write permissions on bucket `frametoque-com`.
3. Update production environment variables.
4. Restart application.
5. Delete the retired API token in Cloudflare.

### Cloudflare Registrar & DNS API Token (`CLOUDFLARE_API_TOKEN`)
1. Log in to Cloudflare Dashboard -> My Profile -> API Tokens.
2. Create a new token with permissions:
   - `Zone - DNS - Edit` (All zones or specific domains)
   - `Zone - Zone - Read` (All zones)
3. Update `CLOUDFLARE_API_TOKEN` in server environment (`.env.local` / systemd / PM2).
4. Run `pm2 reload frametoque` to apply.
5. Test domain synchronization via Admin -> Domains -> Sync.
6. Delete or revoke the previous token in Cloudflare Dashboard.

### Internal Job & Feed Secrets (`CRON_SECRET` & `CALENDAR_FEED_SECRET`)
1. Generate new high-entropy secrets (minimum 32 bytes):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update external callers (e.g. Vercel Cron, GitHub Actions, Google Calendar subscribe URL) with the new secret.
3. Update `CRON_SECRET` and `CALENDAR_FEED_SECRET` in `.env.local`.
4. Reload the application process: `pm2 reload frametoque`.

### Database Connection String (`DATABASE_URL`)
1. Log in to Supabase Dashboard -> Project Settings -> Database.
2. Select **Reset database password** to generate a new strong password.
3. Note: This will temporarily invalidate existing connections.
4. Update `DATABASE_URL` with the new credentials in production environment.
5. Restart the application process: `pm2 restart frametoque`.
6. Verify active connection health via `/api/health` or admin portal.

