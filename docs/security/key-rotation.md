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

