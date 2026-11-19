# Incident Response Runbook: Master Encryption Key Compromise

**Trigger**: `APP_FIELD_ENCRYPTION_KEY` or `CREDENTIALS_ENCRYPTION_KEY` is suspected or confirmed compromised.

---

## Phase 1: Key Re-derivation & Dual-Key Deployment (T + 0 to 30m)
1. **Generate New High-Entropy Master Key**:
   - Generate a cryptographically secure 256-bit key:
     ```bash
     node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
     ```
2. **Configure Key Rotation in Environment**:
   - Set `APP_FIELD_ENCRYPTION_KEY` = `<NEW_KEY_HEX>`.
   - Set `APP_FIELD_ENCRYPTION_KEY_OLD` = `<OLD_KEY_HEX>`.
   - In `src/lib/crypto-vault.ts`, decrypt attempts test the new key first; if decryption tag authentication fails, fallback to `_OLD` key during the rotation window.

---

## Phase 2: Ciphertext Re-encryption Backfill (T + 30m to 60m)
1. **Run Key Rotation Re-encryption Script**:
   - Re-encrypt all records across `admin_accounts`, `admin_clients`, `admin_agreements`, and `admin_site_credentials` with the new key version (`v2:...`).
2. **Verify Decryption Integrity**:
   - Validate 100% round-trip match against decrypted data before overwriting.

---

## Phase 3: Retirement of Compromised Key (T + 60m to 90m)
1. **Remove Old Key**:
   - Remove `APP_FIELD_ENCRYPTION_KEY_OLD` from Vercel / server environment.
2. **Redeploy & Confirm Zero Decryption Failures**:
   - Verify `admin_system_logs` for any decryption errors.
