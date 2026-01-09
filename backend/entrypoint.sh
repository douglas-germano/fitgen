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

# Run database migrations
echo "Running database migrations..."
python3 -m flask db upgrade || {
    echo "WARNING: Database migrations failed or no migrations to run"
}

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

