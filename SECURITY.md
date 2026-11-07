# Security Policy

Frametoque Digital Media takes the security of our systems, infrastructure, and customer data seriously. We appreciate the responsible disclosure of any vulnerabilities found by security researchers and the community.

---

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive data exposure, please notify us immediately by emailing:

📧 **security@frametoque.com**

Please do **NOT** open a public GitHub issue or disclose the vulnerability publicly until it has been acknowledged, addressed, and patched.

### What to Include in Your Report
To help us triage and validate your report quickly, please include:
- A descriptive summary of the issue.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- The affected component, URL, or API endpoint.
- Potential impact and severity assessment.
- Any suggestions for mitigation or remediation.

---

## Response Targets & SLA

We are committed to handling all vulnerability reports in a timely and professional manner:
- **Initial Acknowledgment**: Within **24 hours** of receipt.
- **Triage & Validation**: Within **72 hours**.
- **Fix Timeline**:
  - **Critical & High Severity**: Patched within **7 business days**.
  - **Medium & Low Severity**: Patched within **30 business days**.
- **Status Updates**: We will keep the reporter informed throughout the triage and resolution lifecycle.

---

## Scope

### In Scope
- Web Application: `https://frametoque.com` and all authenticated client/admin portal routes.
- API Endpoints: All Next.js server actions, `/api/*` routes, and webhook handlers.
- Cryptographic vault and authentication systems.

### Out of Scope
- Denial of Service (DoS / DDoS) attacks or resource exhaustion attempts.
- Social engineering, phishing, or physical attacks against employees, offices, or contractors.
- Attacks requiring physical possession of an unlocked user device.
- Automated vulnerability scanning outputs without reproducible business-logic or exploit impact.
- Compromise of third-party external providers (e.g. Cloudflare, Clerk, Supabase, Vercel) outside our project configuration.

---

## Safe Harbour & Research Guidelines

We consider security research conducted in accordance with this policy to be authorized, and will not initiate legal action against researchers who:
1. Act in good faith to avoid privacy violations, data destruction, and service interruption.
2. Do not access, modify, or exfiltrate data belonging to other customers or Frametoque employees.
3. Test vulnerabilities only on accounts and resources they own, or via local test environments.
4. Give us a reasonable amount of time to remediate the vulnerability before public disclosure.
5. Comply with all applicable local, national, and international laws.
