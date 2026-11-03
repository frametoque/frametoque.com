# Security Monitoring & Alerting Design

This document specifies the events, audit thresholds, and alerting integrations required to detect anomalous or malicious activities in production.

---

## 1. Monitored Security Events

| Event Category | Trigger Condition | Severity | Action |
| :--- | :--- | :--- | :--- |
| **Authentication Failures** | > 5 failed logins within 5 minutes for a single IP or email | Medium | Clerk automatic lockout / rate-limiting |
| **Administrative Access** | Successful login to `/admin` from a previously unseen IP | Info / Low | Log in `admin_system_logs` + email notification |
| **Privilege Escalation** | Any modification to user `publicMetadata.role` | High | Immediate Slack / Discord webhook notification |
| **SSRF Probe Attempt** | Request to `/api/admin/screenshot` with blocked private IP or loopback address | High | Return 403, log source IP to security alert channel |
| **Cryptographic Tamper** | GCM authentication tag mismatch or corrupted ciphertext decryption attempt | High | Alert engineering team of potential database manipulation |
| **Abnormal Financial Mutation** | Transfer or invoice deletion exceeding LKR 500,000 threshold | Medium | Require second admin confirmation or audit alert |
| **High Frequency File Uploads** | More than 20 uploads in 1 minute from a single user session | Medium | Throttle IP / review bucket activity |

---

## 2. Integration Recommendations

1. **Uptime & Error Tracking**: Sentry or LogRocket configured with PII masking (stripping authorization headers, passwords, and sensitive fields).
2. **Webhooks for Critical Events**: Add a Discord or Slack webhook URL (`SECURITY_ALERT_WEBHOOK_URL`) to [`src/lib/logger.ts`](file:///Users/nelitha/Dev/frametoque.com/src/lib/logger.ts) to push high-severity alerts immediately.
3. **AWS GuardDuty**: Enable GuardDuty on the AWS EC2 account to monitor VPC flow logs for DNS exfiltration and unauthorized port scans.

