# API Design

Version: 1.0

Backend Framework: FastAPI

API Style: REST

Authentication: JWT + Secure Cookies

---

# Authentication APIs

POST /api/auth/login

Commander Login

---

POST /api/auth/logout

Commander Logout

---

GET /api/auth/session

Check Active Session

---

# Dashboard APIs

GET /api/dashboard/status

Returns system overview.

---

GET /api/dashboard/logs

Returns latest activity.

---

# Earth APIs

GET /api/earth/location

Search location.

---

GET /api/earth/bookmarks

Saved locations.

---

POST /api/earth/bookmarks

Create bookmark.

---

DELETE /api/earth/bookmarks/{id}

Delete bookmark.

---

# Radar APIs

GET /api/radar/status

Radar status.

---

POST /api/radar/start

Start radar.

---

POST /api/radar/stop

Stop radar.

---

# Engine APIs

GET /api/engine/status

Current engine state.

---

POST /api/engine/start

Ignition sequence.

---

POST /api/engine/shutdown

Shutdown engine.

---

GET /api/engine/logs

Engine history.

---

# Research APIs

GET /api/research

All research.

---

POST /api/research

Create research.

---

PUT /api/research/{id}

Update research.

---

DELETE /api/research/{id}

Delete research.

---

# Dataset APIs

GET /api/datasets

Dataset list.

---

POST /api/datasets

Create dataset.

---

DELETE /api/datasets/{id}

Delete dataset.

---

# Experiment APIs

GET /api/experiments

All experiments.

---

POST /api/experiments

New experiment.

---

PUT /api/experiments/{id}

Update experiment.

---

# Logs APIs

GET /api/logs

Activity logs.

---

GET /api/security/events

Security events.

---

# Settings APIs

GET /api/settings

Current settings.

---

PUT /api/settings

Update settings.