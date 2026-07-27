
# 🛡️ Security Policy — THE MRIDANSH HQ

**Jagannath Command Center (JCC)** treats security as a core system layer. This document outlines supported versions, reporting procedures, and the security architecture already in place.

---

## 📦 Supported Versions

| Version | Supported |
|---|---|
| v1.0.0-rc1 (current) | ✅ |
| Pre-release / experimental branches | ⚠️ Best effort only |
| Older tags | ❌ |

Only the latest release candidate and stable releases receive security patches.

---

## 🚨 Reporting a Vulnerability

**Please do not open a public GitHub Issue for security vulnerabilities.**

If you discover a vulnerability, report it privately through one of the following channels:

- GitHub's private **Security Advisories** feature (preferred, if enabled on this repository)
- Direct contact with the maintainer via the repository owner's listed contact method

When reporting, please include:

- A clear description of the vulnerability
- Steps to reproduce (proof-of-concept if possible)
- Affected endpoint(s), module(s), or component(s)
- Potential impact (data exposure, privilege escalation, DoS, etc.)

You will receive an acknowledgment within a reasonable timeframe, and we will work with you on a coordinated disclosure timeline before any public details are released.

---

## 🔐 Existing Security Architecture

The following controls are already implemented and should be considered when evaluating a report's severity:

- 🔐 JWT-based authentication
- 🍪 HttpOnly cookie authentication
- 🛡️ Security headers middleware
- 🚫 Content Security Policy
- 🧱 X-Frame-Options protection
- 🧪 X-Content-Type-Options protection
- 🔒 Referrer Policy enforcement
- 🔥 HTTPS-aware HSTS
- 🚦 Client IP-based API rate limiting
- 🧾 Security event logging
- 🔑 Environment-based secret management
- 🧹 Sanitized production error responses

**Rate Limits**

| Endpoint | Limit |
|---|---|
| Authentication Login | 5 requests/minute/IP |
| AI Query & Stream | 10 requests/minute/IP |
| General API | 100 requests/minute/IP |
| Liveness Checks | Exempt |

---

## 🩺 Diagnostics & Monitoring

The `/diagnostics` cockpit continuously tracks failed authentication events and active security threats. Any anomaly identified through this channel is treated as a priority investigation.

---

## ⚠️ Out of Scope

The following are generally **not** considered valid security reports unless a concrete exploit path is demonstrated:

- Missing security headers on non-production/local development builds
- Rate-limit tuning suggestions without a demonstrated abuse vector
- Vulnerabilities in third-party dependencies without a working proof-of-concept against this project
- Social engineering or physical access scenarios

---

## 🔑 Responsible Disclosure

We ask that you:

1. Give us reasonable time to investigate and patch before public disclosure
2. Avoid accessing, modifying, or destroying data beyond what's necessary to demonstrate the issue
3. Do not perform testing against production infrastructure without prior authorization

Researchers who follow responsible disclosure will be credited (with permission) in release notes.

---

**Security is not a feature. It's a system layer.**
