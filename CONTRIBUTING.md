
# 🤝 Contributing to THE MRIDANSH HQ

Thank you for your interest in contributing to **THE MRIDANSH HQ — Jagannath Command Center (JCC)**. This project follows a mission-control-grade engineering standard, and contributions are expected to meet that bar.

---

## 🧭 Before You Start

- Read this document fully before opening a Pull Request.
- Read `SECURITY.md` if your contribution touches authentication, rate limiting, headers, or any security-adjacent code.
- Check existing Issues and Pull Requests to avoid duplicate work.
- For major changes, open an Issue first to discuss the proposed change before investing significant effort.

---

## 🏛️ Project Architecture Principles

All contributions must respect the existing architecture:

FRONTEND (Next.js / React / TypeScript)
↓
API & APPLICATION LAYER (FastAPI / ASGI)
↓
SERVICE ARCHITECTURE (AI / Search / Logging / Integrations / Health / Security)
↓
DATA LAYER (SQLAlchemy / SQLite / PostgreSQL)
↓
EXTERNAL INTELLIGENCE (NASA / Weather / AI Providers / GitHub / Maps)


- Business logic stays out of the UI component library (`frontend/components/ui/`).
- New mission systems (Earth, Radar, Engine, etc.) must follow the existing module pattern — do not introduce a parallel architecture.
- New external integrations must implement the existing resilience pattern: exponential backoff, timeout handling, structured error handling, and offline mock fallback.
- Never hardcode secrets, API keys, or credentials anywhere in source. Use environment variables per `.env.example`.

---

## 🛠️ Development Setup

```bash
git clone <your-repository-url>
cd THE_MRIDANSH_HQ

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd ../frontend
npm install
npm run dev
```

---

## ✅ Contribution Checklist

Before submitting a Pull Request, confirm:

- [ ] Code follows existing style and folder conventions
- [ ] New functionality includes corresponding tests (backend: `unittest`, frontend: `node:test`)
- [ ] Full verification suite passes locally
- [ ] Production build passes (`npm run build --prefix frontend`)
- [ ] No secrets, keys, or credentials committed
- [ ] Security headers / rate limits / auth flows unaffected unless intentionally modified (and documented)
- [ ] Documentation updated (`docs/DEVELOPER_GUIDE.md`) if architecture, API, or models changed

---

## 🧪 Running the Full Verification Suite

**Backend**
```bash
.\backend\.venv\Scripts\python tests/run_backend_tests.py
```

**Frontend**
```bash
npm test --prefix frontend
```

A contribution is not considered ready for review until both suites pass with **zero failures**.

---

## 🧾 Commit & PR Guidelines

- Use clear, descriptive commit messages (imperative mood: `Add radar sweep animation`, not `added stuff`).
- Keep Pull Requests scoped to a single concern — avoid bundling unrelated changes.
- Reference related Issues in the PR description (`Closes #123`).
- Include a short summary of **what changed** and **why**, not just a diff description.
- Screenshots or short clips are appreciated for any visual/theme/UI changes.

---

## 🔐 Security-Sensitive Contributions

Any change touching authentication, JWT handling, cookies, CSP, rate limiting, or the diagnostics endpoints must:

- Be clearly flagged in the PR description
- Not be merged without maintainer review
- Follow the responsible disclosure process in `SECURITY.md` if it relates to an existing vulnerability

---

## 🛰️ Code of Conduct

Be respectful, be precise, and treat this project with the same rigor you'd bring to mission-critical systems. Constructive criticism is welcome; disruptive or bad-faith behavior is not.

---

**Built for intelligence. Designed for control. Engineered for the mission.**
