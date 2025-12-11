from app.extensions import db
from app.models.notification import Notification
from datetime import datetime

class NotificationService:
    @staticmethod
    def trigger_notification(user_id, type, title, message, link_type=None, link_id=None):
        """
        Creates a new notification if a similar one hasn't been sent recently (today).
        """
        # Check for duplicates today to avoid spam (especially for goals)
        today = datetime.utcnow().date()
        start_of_day = datetime.combine(today, datetime.min.time())
        
        existing = Notification.query.filter(
            Notification.user_id == user_id,
            Notification.type == type,
            Notification.title == title,
            Notification.created_at >= start_of_day
        ).first()
        
        if existing:
            return None # Already notified today
            
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            link_type=link_type,
            link_id=link_id,
            created_at=datetime.utcnow()
        )
        
        db.session.add(notification)
        db.session.commit()
        return notification

    @staticmethod
    def broadcast_notification(title, message, type='system'):
        """
        Sends a notification to ALL users.
        """
        from app.models.user import User
        users = User.query.all()
        
        count = 0
        for user in users:
            n = Notification(
                user_id=user.id,
                type=type,
                title=title,
                message=message,
                created_at=datetime.utcnow()
            )
            db.session.add(n)
            count += 1
            
        db.session.commit()
        return count
