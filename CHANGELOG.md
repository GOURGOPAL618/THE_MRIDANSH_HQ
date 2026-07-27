
# 📜 Changelog

All notable changes to **THE MRIDANSH HQ** are documented here.

This project adheres to [Semantic Versioning](https://semver.org/) and follows the [Keep a Changelog](https://keepachangelog.com/) format.

---

## [v1.0.0-rc1] — Release Candidate

### 🟢 Status
Release Candidate — 45/45 backend tests passing, 5/5 frontend tests passing.

### ✨ Added
- Core application architecture (FastAPI + Next.js cockpit)
- JWT-based authentication with HttpOnly cookie support
- Research, Dataset, and Experiment management systems
- Mission Systems: Earth, Radar, Engine telemetry modules
- Universal Global Search (SQLite LIKE + FTS5-compatible)
- JCC AI Core: Logs Analyzer, Research Abstractor, Dataset Analyst, Experiment Assistant, General Assistant
- SSE-based AI streaming with authentication-aware handling
- External API Integration Center: NASA, OpenWeather, OpenAI, Google Gemini, GitHub, Map Services
- Production Diagnostics Center (`/diagnostics`) with full system telemetry
- Centralized dynamic Visual Theme Engine (7 presets, CSS-variable driven)
- Central reusable UI component library (`frontend/components/ui/`)
- Security headers middleware: CSP, X-Frame-Options, X-Content-Type-Options, Referrer Policy, HSTS
- Client IP-based API rate limiting across all endpoint tiers
- Security event logging and sanitized production error responses
- Automated testing architecture (Python `unittest` + Node.js `node:test`)
- Docker deployment with automatic migration on container start
- GitHub Actions CI/CD pipeline
- Developer documentation (`docs/DEVELOPER_GUIDE.md`)

### ⚙️ Performance
- GZip response compression
- SQLite WAL mode with `synchronous=NORMAL`
- Cache-Control policies across API responses
- Frontend dynamic imports, code splitting, and React memoization
- Lazy loading of heavy visual systems with reduced-motion support

### 🔌 Integration Stubs (Planned)
- 🛰️ Pixxel
- 🌍 ESA
- 🇮🇳 ISRO

### 📌 Known Deferrals
- Quick Start and live demo sections deferred to public launch day

---

## [Unreleased]

### Planned
- Final production audit follow-ups
- Additional mission system modules
- Expanded AI provider support

---

*Older pre-release / experimental iterations are not individually tracked in this changelog.*
