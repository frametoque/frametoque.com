# Incident Response Runbook: Credential & API Key Leak

**Trigger**: An API key, database URL, Clerk secret, Cloudflare token, or service account credential is discovered committed to git, exposed in client bundles, or leaked publicly.

---

## Phase 1: Triage & Identification (T + 0 to 15m)
1. **Identify the Leaked Secret**:
   - Determine exact service: Clerk, Supabase `DATABASE_URL`, Cloudflare API Token, Groq API Key, Payments.lk Secret, or R2 credentials.
   - Determine exposure scope: Public commit, private PR, client-side bundle, or error log.
2. **Assess Exposure Duration**:
   - Run `git log -S "<secret_hint>" --oneline` to pinpoint when the secret was introduced.

---

## Phase 2: Immediate Containment (T + 15m to 30m)
1. **Revoke the Leaked Secret at Provider**:
   - **Clerk**: Rotate `CLERK_SECRET_KEY` in Clerk Dashboard &rarr; API Keys &rarr; Generate New Secret Key.
   - **Database**: In Supabase Console &rarr; Database &rarr; Reset Database Password. Update connection pooling string.
   - **Cloudflare**: In Cloudflare Dashboard &rarr; API Tokens &rarr; Revoke Token immediately.
   - **Cloudflare R2**: In Cloudflare R2 &rarr; Manage R2 API Tokens &rarr; Delete compromised token & generate new token.
   - **Payments.lk**: In Payments.lk Merchant Portal &rarr; Settings &rarr; API & Webhooks &rarr; Regenerate Secret Key.
2. **Deploy New Secret**:
   - Update Vercel Environment Variables: `vercel env add <KEY_NAME> production`.
   - Trigger production redeployment: `vercel redeploy`.

---

## Phase 3: Git History Purge & Verification (T + 30m to 60m)
1. **Remove Secret from Git History**:
   - Use `git-filter-repo` or BFG Repo-Cleaner to scrub the secret from all branches and tags.
   - Force push cleaned refs if repository is public: `git push origin --force --all`.
2. **Audit Access Logs**:
   - Check Cloudflare audit logs, Supabase database query logs, and Clerk user session logs for unauthorized activity during the exposure window.
