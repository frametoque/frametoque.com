# Database Security Checklist (Supabase & PostgreSQL)

This checklist outlines the mandatory security configurations and access-control verification for the production PostgreSQL database managed via Supabase.

---

## 1. Network & Transport Security

- [x] **Enforce SSL/TLS In Transit**:
  - Connection string must enforce SSL mode: `sslmode=require` or explicit certificate validation (`rejectUnauthorized: true`).
  - Verify TLS 1.3 is negotiated for all client-to-database connections.
- [ ] **Network Allowlisting / Network Restrictions**:
  - In Supabase Dashboard -> **Project Settings** -> **Database** -> **Network Restrictions**:
  - Restrict inbound traffic to the production hosting egress IP addresses (e.g. EC2 Elastic IP, Vercel IP range, or AWS VPC CIDR).
  - Disable unrestricted `0.0.0.0/0` public internet access.
- [x] **Connection Pooling Isolation**:
  - Use Supavisor transaction pooling on port `6543` for serverless or short-lived server actions to prevent connection exhaustion.
  - Reserve direct session connection (port `5432`) strictly for administrative migrations and schema alterations.

---

## 2. Access Control & Row-Level Security (RLS)

- [ ] **Enable Row Level Security (RLS) on All Public Tables**:
  - Ensure every table in the `public` schema has RLS enabled to prevent direct PostgREST exposure if Supabase public API keys are enabled.
  - Run the auditing script:
    ```sql
    -- View tables with RLS disabled:
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false;
    ```
  - Apply [`scripts/enable-rls.sql`](../../scripts/enable-rls.sql) to enable RLS across all tables.
- [x] **Least-Privilege Database Roles**:
  - The application connects via a restricted application role, not the PostgreSQL superuser.
  - The application user does NOT have permission to drop schemas, alter system catalog, or bypass RLS without explicit server-side policies.

---

## 3. Storage Encryption & Data Protection

- [x] **Encryption At Rest**:
  - Supabase utilizes AWS EBS storage with automated AES-256 encryption managed via AWS KMS.
- [x] **Application Field-Level Encryption**:
  - Sensitive personal and banking data (`admin_accounts.account_number_encrypted`, `admin_clients.phone_encrypted`, `admin_clients.address_encrypted`, `admin_agreements.client_sig_image_encrypted`) is encrypted with AES-256-GCM before writing to the database.
  - Even in the event of a raw database dump or physical disk compromise, sensitive columns remain unreadable without `APP_FIELD_ENCRYPTION_KEY`.
- [x] **Deterministic Blind Indexing**:
  - Exact-match lookups utilize HMAC-SHA256 blind indexes (`phone_bidx`, `account_number_bidx`) derived from an independent salt, preserving searchability without exposing plaintext.

---

## 4. Backups, Retention & Recovery

- [x] **Automated Physical Snapshots**:
  - Supabase takes daily automated backups retained according to plan settings.
- [ ] **Point-in-Time Recovery (PITR)**:
  - Verify PITR is activated in the Supabase Dashboard (Database -> Backups -> Point in Time Recovery) allowing restoration to any second within the retention window (e.g., 7 days).
- [x] **Quarterly Restore Drills**:
  - Execute the restore drill as defined in [`backup-and-recovery.md`](./backup-and-recovery.md) every quarter to verify dump decodability and table integrity.
