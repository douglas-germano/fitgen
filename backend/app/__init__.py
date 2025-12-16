from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from app.shared.config import config
from app.shared.extensions import db, migrate, jwt, swagger
from app.shared.utils.logger import setup_logger

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Swagger Configuration
    app.config['SWAGGER'] = {
        'title': 'FitGen API',
        'uiversion': 3,
        'version': '1.0.0',
        'description': 'API documentation for FitGen backend'
    }

    # Initialize CORS
    CORS(app, resources={r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "https://fitgen.suacozinha.site"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 600
    }})
    
    # Initialize Rate Limiter (in-memory for development, use Redis in production)
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["2000 per day", "500 per hour"],
        storage_uri="memory://",  # Use "redis://localhost:6379" in production
        strategy="fixed-window"
    )
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
    swagger.init_app(app)
    
    # Setup logging
    setup_logger(app)

    # Import models to ensure they are registered with SQLAlchemy
    # Import model registry to ensure all models are known to SQLAlchemy
    from app.shared import model_registry
    
    # Register commands
    from app.commands import seed_command, promote_user_command
    app.cli.add_command(seed_command)
    app.cli.add_command(promote_user_command)

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
    from app.modules.communication.interface.routes_feedback import feedback_bp
    from app.modules.communication.interface.routes_notifications import notifications_bp
    from app.modules.analytics.interface.routes_progress import progress_bp
    from app.modules.communication.interface.routes_webhooks import webhooks_bp
    from app.modules.coach.interface.routes import chat_bp
    
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
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(feedback_bp, url_prefix='/api/feedback')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(progress_bp, url_prefix='/api/progress')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    
    from app.modules.communication.interface.routes_whatsapp import whatsapp_bp
    app.register_blueprint(whatsapp_bp, url_prefix='/api/whatsapp')

    
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
