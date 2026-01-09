# Railway Deployment Guide - FitGen Backend

## 📋 Prerequisites

1. Railway account ([railway.app](https://railway.app))
2. GitHub repository connected
3. PostgreSQL database (can be provisioned on Railway)
4. Redis instance (can be provisioned on Railway)

## 🚀 Deployment Steps

### 1. Create New Project on Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `fitgen` repository
5. Set root directory to `/backend`

### 2. Add PostgreSQL Database

1. Click "New" → "Database" → "PostgreSQL"
2. Railway will automatically create `DATABASE_URL` variable

### 3. Add Redis

1. Click "New" → "Database" → "Redis"
2. Railway will automatically create `REDIS_URL` variable

### 4. Configure Environment Variables

Go to your service → Variables tab and add the following:

```bash
# Required - Application
SECRET_KEY=your_secret_key_here_change_in_production
JWT_SECRET_KEY=your_jwt_secret_key_here_change_in_production
JWT_ACCESS_TOKEN_EXPIRES=1800
JWT_REFRESH_TOKEN_EXPIRES=2592000

# Required - Database (automatically set by Railway PostgreSQL)
# DATABASE_URL=postgresql://user:password@host:port/database

# Required - Redis (automatically set by Railway Redis)
# REDIS_HOST=redis-host
# REDIS_PORT=6379
# REDIS_DB=0

# Required - Frontend
FRONTEND_URL=https://your-frontend-url.vercel.app

# Required - Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Optional - Firebase (for push notifications)
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY_FILE=/app/vapid-private-key.pem
VAPID_SUBJECT=mailto:your@email.com

# Optional - Evolution API (WhatsApp)
EVOLUTION_API_URL=https://your-evolution-api-url
EVOLUTION_API_KEY=your_evolution_api_key
EVOLUTION_INSTANCE_NAME=FitGen

# Optional - Brevo (Email)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your@email.com
BREVO_SENDER_NAME=FitGen
```

### 5. Deploy

Railway will automatically:
1. Detect Python application
2. Install dependencies from `requirements.txt`
3. Run database migrations
4. Start the application using Gunicorn

### 6. Run Database Migrations

After first deployment, you may need to run migrations manually:

1. Go to your service
2. Click on "Deployments" tab
3. Click on the latest deployment
4. Click "View Logs"
5. Or use Railway CLI:

```bash
railway run flask db upgrade
```

## 🔍 Health Check

Your application has a health check endpoint at `/health` that Railway will use to monitor the service.

Test it after deployment:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "fitgen-backend",
  "database": "healthy",
  "timestamp": "2026-01-09T..."
}
```

## 📊 Monitoring

- View logs in Railway dashboard
- Check metrics (CPU, Memory, Network)
- Set up alerts for downtime

## 🔄 Automatic Deployments

Railway will automatically deploy when you push to your main branch on GitHub.

## 🔐 Security Notes

1. Never commit `.env` files
2. Use Railway environment variables
3. Rotate secrets regularly
4. Use strong passwords for DATABASE_URL

## 📝 Important Files

- `Procfile` - Defines how to run the app
- `railway.toml` - Railway-specific configuration
- `runtime.txt` - Python version specification
- `requirements.txt` - Python dependencies
- `.railwayignore` - Files to exclude from deployment

## 🐛 Troubleshooting

### Build Fails
- Check `requirements.txt` for incompatible versions
- Verify Python version in `runtime.txt`

### Application Crashes
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure DATABASE_URL is correct

### Database Connection Issues
- Verify PostgreSQL service is running
- Check DATABASE_URL format
- Ensure migrations have been run

### Port Issues
- Railway provides `$PORT` automatically
- Application binds to `0.0.0.0:$PORT`

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Flask Deployment Best Practices](https://flask.palletsprojects.com/en/2.3.x/deploying/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
