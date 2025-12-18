#!/bin/sh
set -e

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:5000 --timeout 120 wsgi:app
