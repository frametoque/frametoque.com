# Backup & Disaster Recovery Runbook

This runbook establishes backup procedures, recovery objectives, and restore testing for Frametoque Digital Media data stores.

---

## 1. Targets & Metrics

- **Recovery Point Objective (RPO)**: <= 1 hour (Maximum acceptable data loss window).
- **Recovery Time Objective (RTO)**: <= 30 minutes (Maximum time to restore full service).

---

## 2. Backup Architecture

### 1. Database (PostgreSQL / Supabase)
- **Automated Snapshots**: Daily automated physical backups managed by Supabase AWS KMS-encrypted storage.
- **Manual Point-in-Time Dump**:
  Before applying schema changes or major version updates, take a manual logical dump:
  ```bash
  pg_dump "$DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="backup_frametoque_$(date +%Y%m%d_%H%M%S).dump"
  ```
  Encrypt the dump immediately before transferring off-host:
  ```bash
  gpg --symmetric --cipher-algo AES256 backup_frametoque_*.dump
  rm -f backup_frametoque_*.dump
  ```

### 2. Object Storage (Cloudflare R2)
- Cloudflare R2 provides 99.999999999% (11 9's) durability.
- Enable **Bucket Versioning** in the Cloudflare Dashboard to protect against accidental deletions or ransomware overwrite.

---

## 3. Restore Verification Drill

To verify backup validity quarterly:
1. Spin up a temporary local or staging PostgreSQL container:
   ```bash
   docker run --name ft-restore-test -e POSTGRES_PASSWORD=test -p 5433:5432 -d postgres:16
   ```
2. Decrypt and restore the latest snapshot:
   ```bash
   gpg --decrypt backup_frametoque_*.dump.gpg > temp_restore.dump
   pg_restore -d "postgres://postgres:test@localhost:5433/postgres" temp_restore.dump
   rm -f temp_restore.dump
   ```
3. Run verification queries checking row counts on `users`, `invoices`, and `admin_accounts`:
   ```sql
   SELECT count(*) FROM invoices;
   SELECT count(*) FROM admin_accounts;
   ```
4. Tear down the test container:
   ```bash
   docker stop ft-restore-test && docker rm ft-restore-test
   ```
