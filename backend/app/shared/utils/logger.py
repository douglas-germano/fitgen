"""
Logging configuration
"""
import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logger(app):
    """
    Configure application logging with rotation
    """
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        file_handler = RotatingFileHandler(
            'logs/fitgen.log',
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        # Avoid adding multiple handlers if they already exist
        if not app.logger.handlers:
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('FitGen startup')
