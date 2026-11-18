"""In-app + push notifications for community events (best-effort)."""
import logging

log = logging.getLogger(__name__)


def notify(user_id, title, message, link_type=None, link_id=None):
    try:
        from app.modules.communication.application.notification_service import NotificationService
        NotificationService.trigger_notification(user_id, 'social', title, message, link_type=link_type, link_id=link_id)
    except Exception as exc:
        log.warning('community notification failed: %s', exc)
        from app.shared.extensions import db
        db.session.rollback()
