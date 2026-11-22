#!/bin/sh
set -e

echo "========================================="
echo "FitGen Backend Starting..."
echo "========================================="

# Check critical environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    echo "ERROR: SECRET_KEY is not set!"
    exit 1
fi

if [ -z "$JWT_SECRET_KEY" ]; then
    echo "ERROR: JWT_SECRET_KEY is not set!"
    exit 1
fi

echo "✓ Environment variables verified"

# Migrations and seeds run under a Postgres advisory lock: with several replicas
# starting together, one runs them while the others wait (scripts/run_locked.py).
python3 scripts/run_locked.py startup-tasks sh -ec '
# Schema changes go through Alembic (backend/migrations); a failure stops the deploy.
python3 -m flask migrate-db

# Load the official exercise library (idempotent; keeps admin edits)
python3 -m flask seed-exercises
python3 -m flask apply-community-sharing-defaults
'

echo "Starting Gunicorn..."
echo "Binding to 0.0.0.0:${PORT:-5000}"
echo "========================================="

# Start Gunicorn
exec gunicorn \
    --bind 0.0.0.0:${PORT:-5000} \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    wsgi:app

