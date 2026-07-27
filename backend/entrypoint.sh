#!/bin/sh
set -e

echo "==> Running Database Schema Migrations (Alembic)..."
alembic upgrade head

echo "==> Starting JCC Command Cockpit ASGI Server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
