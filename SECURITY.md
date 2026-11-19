# Security Policy

Frametoque is committed to ensuring the safety, confidentiality, and integrity of customer data and digital assets. This document outlines our vulnerability disclosure policy, supported versions, and procedures for reporting security issues.

---

## 1. Supported Versions

Security updates and critical patches are actively applied to the following versions of the Frametoque platform:

| Version | Status | Supported |
| :--- | :--- | :---: |
| Next.js 16.x / App Router | Active Production | Yes |
| Node.js >= 20.x | Active LTS | Yes |
| Legacy Builds (< 15.x) | Deprecated | No |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability, we appreciate your help in disclosing it to us responsibly. 

> [!IMPORTANT]
> **Do not open public GitHub issues, discussions, or pull requests for security vulnerabilities.**

### Contact Channels
- **Email**: `security@frametoque.com`
- **PGP Fingerprint**: (Available upon request)
- **Response Window**: We acknowledge receipt of vulnerability reports within **24 hours** and provide a preliminary risk assessment within **48 hours**.

### What to Include in Your Report
To help us triage and reproduce the issue quickly, please provide:
1. **Description**: Clear description of the vulnerability and potential impact.
2. **Reproduction Steps**: Step-by-step instructions or minimal Proof of Concept (PoC).
3. **Affected Endpoints/Files**: Exact URLs, routes, or code references.
4. **Environment**: Browser, operating system, and network environment (if applicable).

---

## 3. Responsible Disclosure Guidelines
- **No Disruption**: Do not degrade the performance of live services or execute Denial of Service (DoS/DDoS) attacks.
- **Privacy First**: Do not access, modify, delete, or harvest personal customer data or financial records. Test vulnerabilities against synthetic accounts only.
- **Coordination**: Allow our engineering team reasonable time (typically up to 30 days) to deploy a fix before publishing details publicly.

---

## 4. Security Architecture & Controls

Frametoque employs defense-in-depth across the entire application stack:
- **Transport Security**: Enforced TLS 1.3, strict HTTPS redirection, and preloaded HTTP Strict Transport Security (`max-age=63072000`).
- **Field-Level Encryption**: Application-level AES-256-GCM envelope encryption with per-record HKDF data encryption keys and Additional Authenticated Data (AAD) binding.
- **Identity & Authorization**: Clerk JWT verification with centralized server session guards (`requireAdminSession`, `requireUserSession`) and IDOR mitigation.
- **Payment Integrity**: Constant-time HMAC-SHA256 signature verification with replay timestamp drift prevention.
- **Storage Isolation**: Cloudflare R2 object storage with server-side encryption and path traversal sanitization.
