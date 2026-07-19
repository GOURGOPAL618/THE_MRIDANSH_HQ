# System Architecture

Version: 1.0

---

# Overall Architecture

Frontend

↓

Backend API

↓

Database

↓

Storage

---

# Frontend

Framework

- Next.js

Language

- TypeScript

Styling

- Tailwind CSS

Graphics

- Three.js

- React Three Fiber

Maps

- CesiumJS

Animation

- Framer Motion

WebGL Routing Strategy

- Earth Operations (CesiumJS), Radar Control (canvas/GPU sweeps), and Engine Room (Three.js) are strictly designed as separate page routes. 
- This ensures only one WebGL-heavy context is active and mounted at any time, preventing WebGL context losses and maintaining 60 FPS performance.

---

# Backend

Framework

- FastAPI

Responsibilities

- Authentication

- APIs

- Logging

- Security

- AI Integration

---

# Database

PostgreSQL

Stores

- Commander Information

- Sessions

- Logs

- Research

- Datasets

- Settings

---

# Authentication

Commander Only

Multi-factor Authentication (Future)

Session Validation

Encrypted Credentials

---

# Logging

Every important action will be logged.

Examples

Login

Logout

Engine Activation

Research Access

Dataset Operations

System Settings

---

# Deployment

Frontend

Vercel

Backend

Railway / Render

Database

Neon PostgreSQL

---

# Future Integrations

OpenAI

Gemini

NASA APIs

Weather APIs

Satellite APIs

Remote Sensing APIs

Machine Learning Models