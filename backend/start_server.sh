#!/bin/bash
cd /var/www/fitgen/backend

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Start gunicorn
venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 2 --access-logfile logs/access.log --error-logfile logs/error.log wsgi:app
