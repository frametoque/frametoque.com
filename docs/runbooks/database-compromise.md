# Incident Response Runbook: Database Compromise

**Trigger**: Unauthorized access, data exfiltration alert, unusual query volume, or schema tampering detected on the PostgreSQL cluster.

---

## Phase 1: Immediate Containment (T + 0 to 15m)
1. **Sever Active Sessions & Rotate Credentials**:
   - In Supabase Dashboard &rarr; Project Settings &rarr; Database &rarr; Change Database Password immediately.
   - Kill active pooled connections:
     ```sql
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE pid <> pg_backend_pid() AND datname = 'postgres';
     ```
2. **Restrict Network IP Allowlist**:
   - In Supabase &rarr; Network Restrictions &rarr; Restrict database ingress strictly to trusted Vercel IPs or temporary maintenance IPs.

---

## Phase 2: Assessment & Forensic Audit (T + 15m to 45m)
1. **Determine Blast Radius**:
   - Query `admin_system_logs` and Supabase audit logs:
     ```sql
     SELECT * FROM admin_system_logs ORDER BY created_at DESC LIMIT 100;
     ```
   - Check if sensitive tables (`admin_accounts`, `admin_clients`, `admin_agreements`, `admin_site_credentials`) were queried.
2. **Field-Level Encryption Assessment**:
   - Because sensitive fields (`account_number_encrypted`, `phone_encrypted`, `password_encrypted`, `client_sig_image_encrypted`) are AES-256-GCM ciphertexts with keys stored outside Supabase, verify whether `APP_FIELD_ENCRYPTION_KEY` remained isolated. If the master key was not compromised, encrypted data remains secure.

---

## Phase 3: Restoration & Recovery (T + 45m to 120m)
1. **Restore from Point-in-Time Recovery (PITR)**:
   - If data was tampered or dropped, restore from the last clean Supabase backup snapshot.
2. **Re-enable RLS & Least-Privilege Policies**:
   - Run `scripts/enable-rls.sql` to verify table shielding.
3. **Deploy Verified Application Credentials**:
   - Update `DATABASE_URL` in production environment and redeploy.
