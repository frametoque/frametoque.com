# Incident Response Runbook: Ransomware & Extortion Defense

**Trigger**: Receipt of extortion notice, ransomware demand, or widespread file corruption on database or object storage.

---

## 1. Immediate Isolation
- Terminate all production deployment workflows and revoke active API tokens.
- Set Vercel deployment status to Maintenance / Read-Only.
- Put Supabase database into pause/standby mode to prevent modification.

## 2. Integrity Assessment
- Check Cloudflare R2 object versioning: ensure uncorrupted object versions are available.
- Check Supabase Automated Daily Backups and WAL archives.
- Never communicate with or pay extortionists.

## 3. Clean Rebuild & Restore
- Spin up fresh database instance from the last verified uncorrupted snapshot prior to the infection timestamp.
- Re-deploy codebase from tagged clean git commit (`git checkout security/hardening`).
- Rotate all infrastructure tokens (Supabase, Clerk, Cloudflare, Payments.lk).
