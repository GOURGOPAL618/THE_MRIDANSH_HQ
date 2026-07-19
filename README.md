# THE MRIDANSH Command Headquarters (HQ)

## Overview
THE MRIDANSH Command Headquarters is a private, secure, AI-powered mission control platform designed exclusively for the Commander. It serves as the central operational cockpit for managing research vaults, monitoring engine metrics (AETHER-MRID1607X), visualising global orbital tracks, and inspecting satellite telemetry.

---

## Directory Structure
* `/frontend`: Next.js Web App with Tailwind CSS, Framer Motion, and Three.js / CesiumJS.
* `/backend`: FastAPI REST API with Python, SQLAlchemy, and Argon2 password hashing.
* `/database`: Database migrations (Alembic) and schemas.
* `/assets`: Media, 3D models (GLB), icons, and sound clips.
* `/logs`: System activity audit logs.
* `/storage`: File upload storage.
* `/backups`: Persistent database backup snapshots.

---

## Getting Started

### Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* PostgreSQL Database

### Setup Instructions
1. Copy `.env.example` to `.env` and fill in the required variables.
2. Initialize and configure the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Initialize and configure the backend:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

---

## Development Guidelines
* Refer to the `docs/` directory for full specifications on architecture, security, naming conventions, and release policies.
* Ensure all files conform to styling and format standards before pushing changes.
