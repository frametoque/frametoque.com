# Incident Response Runbook: Third-Party Service Breach

**Trigger**: Notice of security breach or credential compromise from an external service provider (Clerk, Supabase/AWS, Cloudflare, Payments.lk, Groq, or Umami).

---

## 1. Scope & Isolation
- **Clerk Compromise**:
  - Force global session invalidation across all user accounts in Clerk dashboard.
  - Rotate `CLERK_SECRET_KEY` and Webhook Signing Secret.
- **Cloudflare Compromise**:
  - Rotate `CLOUDFLARE_API_TOKEN` and R2 `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
  - Verify Cloudflare DNS records for unauthorized modifications or redirects.
- **Payments.lk Compromise**:
  - Rotate `PAYMENTS_LK_SECRET_KEY` and `PAYMENTS_LK_WEBHOOK_SECRET`.
  - Audit recent `online_payments` and `admin_incomes` for unauthorized transaction IDs.

## 2. Customer Notification & Reporting
- Determine if PII of Sri Lankan or international clients was accessed according to applicable privacy laws (e.g. Sri Lanka Personal Data Protection Act No. 9 of 2022).
- Draft and publish transparent advisory if required.
