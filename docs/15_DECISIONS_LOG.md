# THE MRIDANSH COMMAND HEADQUARTERS

# DECISIONS LOG

Version: 1.0

Commander: Gourgopal Mohapatra

---

## Purpose

This document records every major engineering, architecture, technology, and design decision made during the development of THE MRIDANSH Headquarters.

Every important decision must include:

- Date
- Decision
- Reason
- Alternatives Considered
- Final Status

This document serves as the permanent engineering history of the project.

---

# Decision Template

Date:

Decision:

Reason:

Alternatives Considered:

Final Status:

Notes:

---

# Decisions

---

## Decision 001

Date:

2026-07-19

Decision

Use Next.js as the frontend framework.

Reason

Provides App Router, excellent performance, TypeScript support, and seamless deployment on Vercel.

Alternatives Considered

React + Vite

Final Status

Approved

---

## Decision 002

Date

2026-07-19

Decision

Use FastAPI as backend.

Reason

Fast, lightweight, Python ecosystem, excellent API documentation.

Alternatives

Flask

Django

Final Status

Approved

---

## Decision 003

Date

2026-07-19

Decision

Use PostgreSQL.

Reason

Reliable relational database with excellent scalability.

Alternatives

MySQL

SQLite

MongoDB

Final Status

Approved

---

## Decision 004

Date

2026-07-19

Decision

Use CesiumJS for Earth visualization.

Reason

Professional 3D globe, terrain support, aerospace applications.

Alternatives

Google Maps

Mapbox

Leaflet

Final Status

Approved

---

## Decision 005

Date

2026-07-19

Decision

Use React Three Fiber for 3D rendering.

Reason

Better integration with React ecosystem.

Alternatives

Pure Three.js

BabylonJS

Final Status

Approved

---

## Decision 006

Date

2026-07-19

Decision

Use Commander-only authentication.

Reason

The Headquarters is a private operational system.

Alternatives

Multi-user system

Public accounts

Final Status

Approved

---

## Decision 007

Date

2026-07-19

Decision

Documentation before implementation.

Reason

Reduce ambiguity and maintain long-term consistency.

Final Status

Approved

---

## Decision 008

Date: 2026-07-19

Decision: Use SQLAlchemy + Alembic on the backend instead of Prisma ORM.

Reason: The backend is built using FastAPI (Python), which has native and mature support for SQLAlchemy and Alembic. Bypassing the backend or running Node-based Prisma in Python introduces unnecessary complexity and breaks the layered architecture.

Alternatives Considered: Prisma Client Python, raw SQL.

Final Status: Approved

---

## Decision 009

Date: 2026-07-19

Decision: Use argon2-cffi for password hashing instead of bcrypt.

Reason: Standardize on Argon2 hashing across the security guidelines and authentication models as specified, replacing standard bcrypt dependencies.

Alternatives Considered: bcrypt, pbkdf2.

Final Status: Approved

---

## Decision 010

Date: 2026-07-19

Decision: Enforce kebab-case with no spaces for all asset filenames.

Reason: Avoid URL encoding issues (%20) and standardise files in accordance with the project's folder and file naming rules.

Alternatives Considered: PascalCase, camelCase.

Final Status: Approved

---

## Decision 011

Date: 2026-07-19

Decision: Add CESIUM_ION_TOKEN to required environment variables.

Reason: CesiumJS requires an access token to render global 3D terrains and maps.

Alternatives Considered: Google Maps API key (rejected for aesthetic/aerospace requirements).

Final Status: Approved

---

## Decision 012

Date: 2026-07-19

Decision: Remove email-related environment variables for Version 1.0.

Reason: Email functionality is currently out of scope for the initial Command Headquarters release.

Alternatives Considered: Retaining variables as placeholder.

Final Status: Approved

---

## Decision 013

Date: 2026-07-19

Decision: Treat heavy 3D assets as placeholders for initial development.

Reason: High-fidelity assets (such as the 44MB ISS model) will be optimized and compressed during a dedicated optimization phase later in development.

Alternatives Considered: Optimize assets immediately.

Final Status: Approved

---

## Decision 014

Date: 2026-07-19

Decision: Design Earth Operations, Radar Control, and Engine Room as separate routes/pages.

Reason: Ensures only one WebGL-heavy context (CesiumJS, Three.js, etc.) is mounted and active at any time, eliminating WebGL context conflicts and keeping frontend frame rates high.

Alternatives Considered: Single-page tab-switching without route changes.

Final Status: Approved

---

## Future Decisions

Every future engineering decision must be recorded below.
