# Secret Leakage & Exposure Runbook

If any API key, database connection string, password, or encryption secret is accidentally committed to git, logged, or exposed, execute this runbook immediately.

---

## 1. Immediate Containment Checklist

1. **Assume Immediate Compromise**: Treat any secret pushed to a repository or logged to a public endpoint as compromised from the exact second it left the server.
2. **Do NOT Rely on Rewriting Git History Alone**:
   Removing a secret from git history using `git filter-repo` or `BFG Repo-Cleaner` is necessary for hygiene, but will **NOT** secure the system if an automated scanner picked up the commit.
3. **Revoke the Leaked Secret Immediately**:
   - Database credentials: change password in Supabase dashboard.
   - Clerk / R2 / Groq / Google API keys: delete the old key in provider console and generate a replacement.

---

## 2. Git History Cleanup Procedure

If committed locally or to a remote branch:
1. Ensure the secret is rotated in the real service first.
2. Replace the secret in code with `process.env.<VAR_NAME>`.
3. If purging from git commits:
   ```bash
   # Using git-filter-repo
   pip install git-filter-repo
   git filter-repo --replace-text <(echo "LEAKED_SECRET==>REDACTED_SECRET")
   git push origin main --force
   ```

---

## 3. Log Audit & Impact Verification

1. Inspect logs from the moment of exposure until rotation:
   - Check Supabase connection logs for unfamiliar source IP addresses.
   - Check Cloudflare R2 egress metrics for anomalous data download spikes.
   - Check Clerk audit logs for unauthorized administrative sessions.
2. Document all findings in an Incident Report.
