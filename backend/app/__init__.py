from flask import Flask, jsonify
import os
from flask_cors import CORS
from app.shared.config import config
from app.shared.extensions import db, migrate, jwt, swagger, cache, limiter
from app.shared.utils.logger import setup_logger

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    from app.shared.monitoring import init_monitoring
    init_monitoring(app)
    
    # Configure ProxyFix for Nginx
    from werkzeug.middleware.proxy_fix import ProxyFix
    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )
    
    # Swagger Configuration
    app.config['SWAGGER'] = {
        'title': 'FitGen API',
        'uiversion': 3,
        'version': '1.0.0',
        'description': 'API documentation for FitGen backend'
    }

    # Initialize CORS
    CORS(app, resources={r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", 
        "http://127.0.0.1:3000", "http://127.0.0.1:3001", "https://fitgen.suacozinha.site",
        "https://fitgen.pages.dev",
        # Painel admin (Cloudflare Pages) e domínio oficial
        "https://fitgen-admin.pages.dev", "https://admin.fitgen.pro",
        "https://fitgen.pro", "https://www.fitgen.pro"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }})
    
    
    # Initialize Rate Limiter with fallback to in-memory storage
    redis_url = os.environ.get('REDIS_URL')
    redis_host = os.environ.get('REDIS_HOST')
    
    if redis_url:
        # Use REDIS_URL if provided (Railway format)
        app.config['RATELIMIT_STORAGE_URI'] = redis_url
        app.config['RATELIMIT_STRATEGY'] = "fixed-window"
        app.logger.info(f"Using Redis from REDIS_URL")
    elif redis_host:
        # Fallback to building URL from REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
        redis_port = os.environ.get('REDIS_PORT', 6379)
        redis_password = os.environ.get('REDIS_PASSWORD')
        
        if redis_password:
            redis_uri = f"redis://:{redis_password}@{redis_host}:{redis_port}"
        else:
            redis_uri = f"redis://{redis_host}:{redis_port}"
            
        app.config['RATELIMIT_STORAGE_URI'] = redis_uri
        app.config['RATELIMIT_STRATEGY'] = "fixed-window"
        app.logger.info(f"Using Redis from REDIS_HOST: {redis_host}")
    else:
        # Fallback to in-memory storage (for deployments without Redis)
        app.config['RATELIMIT_STORAGE_URI'] = "memory://"
        app.config['RATELIMIT_STRATEGY'] = "fixed-window"
        app.logger.info("Using in-memory storage for rate limiting")
    
    limiter.init_app(app)
    # Store limiter in app for access in routes
    app.limiter = limiter
    
    
    db.init_app(app)
    
    # PostgreSQL connection pool settings for Supabase
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Flask-JWT-Extended answers 422 for bad/foreign tokens (e.g. signed with an
    # old SECRET). Clients only recover the session on 401, so normalize it.
    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({'msg': reason, 'error': 'invalid_token'}), 401

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({'msg': reason, 'error': 'authorization_required'}), 401

    swagger.init_app(app)
    cache.init_app(app)
    
    # Setup logging
    setup_logger(app)

    from app.modules.communication.application.email_service import missing_config as email_missing_config
    if not app.testing and email_missing_config():
        app.logger.warning('Brevo email disabled, missing env: %s', ', '.join(email_missing_config()))

    # Import models to ensure they are registered with SQLAlchemy
    # Import model registry to ensure all models are known to SQLAlchemy
    from app.shared import model_registry
    
    # Register commands
    from app.commands import seed_command, promote_user_command, community_nudge_command, community_seed_challenges_command
    app.cli.add_command(seed_command)
    app.cli.add_command(promote_user_command)
    app.cli.add_command(community_nudge_command)
    app.cli.add_command(community_seed_challenges_command)

    from app.modules.identity.interface.routes.auth import auth_bp
    from app.modules.identity.interface.routes.onboarding import onboarding_bp
    from app.modules.training.interface.routes_workouts import workouts_bp
    from app.modules.training.interface.routes_exercises import exercises_bp
    from app.modules.nutrition.interface.routes_nutrition import nutrition_bp
    from app.modules.nutrition.interface.routes_history import nutrition_history_bp
    from app.modules.nutrition.interface.routes_diet import diet_bp
    from app.modules.nutrition.interface.routes_hydration import hydration_bp
    from app.modules.gamification.interface.routes import gamification_bp
    from app.modules.analytics.interface.routes_metrics import metrics_bp
    from app.modules.identity.interface.routes.profile import profile_bp
    from app.modules.identity.interface.routes.subscriptions import subscriptions_bp
    from app.modules.identity.interface.routes.admin import admin_bp
    from app.modules.identity.interface.routes import admin_finance  # noqa: F401  (adds /admin/finance/* routes)
    from app.modules.communication.interface.routes_feedback import feedback_bp
    from app.modules.communication.interface.routes_notifications import notifications_bp
    from app.modules.analytics.interface.routes_progress import progress_bp
    from app.modules.communication.interface.routes_webhooks import webhooks_bp
    from app.modules.coach.interface.routes import chat_bp
    from app.modules.community.interface.routes_feed import feed_bp as community_feed_bp
    from app.modules.community.interface.routes_groups import groups_bp as community_groups_bp
    from app.modules.community.interface.routes_challenges import challenges_bp as community_challenges_bp
    from app.modules.community.interface.routes_people import people_bp as community_people_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(onboarding_bp, url_prefix='/api/onboarding')
    app.register_blueprint(workouts_bp, url_prefix='/api/workouts')
    app.register_blueprint(exercises_bp, url_prefix='/api/exercises')
    app.register_blueprint(nutrition_bp, url_prefix='/api/nutrition')
    app.register_blueprint(nutrition_history_bp, url_prefix='/api/nutrition')
    app.register_blueprint(diet_bp, url_prefix='/api/diet')
    app.register_blueprint(hydration_bp, url_prefix='/api/hydration')
    app.register_blueprint(gamification_bp, url_prefix='/api/gamification')
    app.register_blueprint(metrics_bp, url_prefix='/api/metrics')
    from app.modules.analytics.interface.routes_health import health_bp
    app.register_blueprint(health_bp, url_prefix='/api/health')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(progress_bp, url_prefix='/api/progress')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    for community_bp in (community_feed_bp, community_groups_bp, community_challenges_bp, community_people_bp):
        app.register_blueprint(community_bp, url_prefix='/api/community')
    
    from app.modules.communication.interface.routes_whatsapp import whatsapp_bp
    app.register_blueprint(whatsapp_bp, url_prefix='/api/whatsapp')

    
    from app.shared.subscription_access import init_subscription_gate
    init_subscription_gate(app)

    @app.route('/health')
    def health_check():
        """Enhanced health check with database status"""
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            db_status = 'healthy'
        except Exception as e:
            app.logger.error(f'Health check DB error: {str(e)}')
            db_status = 'unhealthy'
        
        from datetime import datetime
        status_code = 200 if db_status == 'healthy' else 503
        
        return {
            'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
            'service': 'fitgen-backend',
            'database': db_status,
            'timestamp': datetime.utcnow().isoformat()
        }, status_code

    @app.route('/static/<path:filename>')
    @app.route('/api/static/<path:filename>')
    def serve_static(filename):
        from flask import send_from_directory
        import os
        return send_from_directory(os.path.join(app.root_path, 'static'), filename)

    return app
