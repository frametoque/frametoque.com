# Incident Response Runbook

This runbook defines the operational procedure for detecting, triaging, containing, and recovering from security incidents affecting Frametoque Digital Media services.

---

## 1. Roles & Escalation

| Role | Responsibility | Escalation Channel |
| :--- | :--- | :--- |
| **Incident Commander** | Lead engineer / system administrator coordinating response | Internal alert channel |
| **Technical Lead** | Diagnoses logs, isolates services, coordinates code/config patches | Emergency technical bridge |
| **Communications Lead** | Manages notifications to affected clients and regulatory bodies | Legal & executive contact |

---

## 2. Response Phases

### Phase 1: Triage (Within 15 minutes of detection)
1. **Confirm the alert**: Verify whether anomalous activity is a true positive or false alarm.
2. **Determine severity**:
   - **P1 (Critical)**: Active breach, arbitrary remote code execution, database exfiltration, or compromised admin credentials.
   - **P2 (High)**: Exploitable vulnerability identified without verified exploitation, or isolated user account takeover.
   - **P3 (Medium)**: Denial of service attempt, brute-force activity mitigated by rate limits.
3. **Declare incident**: Open an incident log with timestamp, affected components, and designated Incident Commander.

### Phase 2: Containment (Immediate)
1. **Isolate compromised credentials**:
   - If a Clerk admin token or database URL is suspected of compromise, rotate the secret immediately.
2. **Network containment**:
   - Use Cloudflare / AWS Security Groups to block malicious IP ranges or geographic sources if experiencing volumetric attacks.
3. **Process isolation**:
   - If EC2 instance shows signs of compromise, snapshot the EBS volume for forensic investigation and launch a clean AMI.
   - Do NOT restart or wipe the compromised machine before taking a memory/disk snapshot.

### Phase 3: Investigation & Eradication
1. **Inspect System Logs**:
   - Query `admin_system_logs` table for administrative actions performed during the incident timeframe.
   - Review PM2 access logs on the server: `pm2 logs frametoque --lines 1000`.
2. **Assess Data Exposure**:
   - Review PostgreSQL query logs and Supabase access logs.
   - Determine whether encrypted columns (AES-256-GCM) or plaintext records were accessed.
3. **Patch Vulnerability**:
   - Develop, test, and deploy code patch to branch `main`.

### Phase 4: Notification (Legal & Regulatory Timelines)
- **GDPR / International Regulations**: If EU citizen personal data was compromised, notification to the supervisory authority is legally mandated within **72 hours** of awareness.
- **Client Notification**: If customer PII or payment slips were exposed, notify affected clients promptly with clear recommendations (e.g., password reset, monitoring statements).

### Phase 5: Post-Mortem & Review
- Document timeline of events, root cause, impact assessment, and corrective action items within 5 business days.
