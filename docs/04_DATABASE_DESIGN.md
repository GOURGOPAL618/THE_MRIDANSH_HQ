# Database Design

Version: 1.0

Database Engine: PostgreSQL

ORM: SQLAlchemy

Migration Tool: Alembic

---

# Overview

The database stores all persistent information related to the Commander, system operations, research, datasets, experiments, and security.

Only one Commander account is supported.

---

# Tables

## Commander

Stores Commander profile information.

Fields

- id
- username
- email
- password_hash
- role
- created_at
- updated_at

---

## Sessions

Stores login sessions.

Fields

- id
- commander_id
- login_time
- logout_time
- ip_address
- browser
- device
- session_token
- status

---

## Activity Logs

Stores every important activity.

Fields

- id
- timestamp
- module
- action
- description
- severity

---

## Research

Stores research documents.

Fields

- id
- title
- category
- description
- tags
- created_at
- updated_at

---

## Datasets

Stores dataset information.

Fields

- id
- dataset_name
- category
- source
- description
- location
- created_at

---

## Experiments

Stores experiment history.

Fields

- id
- title
- objective
- status
- notes
- created_at
- updated_at

---

## Engine Logs

Stores engine activity.

Fields

- id
- timestamp
- engine_state
- thrust_level
- temperature
- diagnostics

---

## Security Events

Stores security events.

Fields

- id
- timestamp
- event
- risk_level
- details

---

## Settings

Stores Commander preferences.

Fields

- id
- theme
- language
- notifications
- performance_mode

---

# Future Tables

- AI Conversations
- Mission Planner
- Satellite Database
- Earth Bookmarks
- Notifications