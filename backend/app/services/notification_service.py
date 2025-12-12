from app.extensions import db
from app.models.notification import Notification
from datetime import datetime

class NotificationService:
    @staticmethod
    def trigger_notification(user_id, type, title, message, link_type=None, link_id=None):
        """
        Creates a new notification if a similar one hasn't been sent recently (today).
        Also sends push notification via FCM (mobile) and Web Push (web/PWA).
        """
        from app.utils.timezone import now_cuiaba, get_today_cuiaba
        
        # Check for duplicates today to avoid spam (especially for goals)
        today = get_today_cuiaba()
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
            created_at=now_cuiaba()
        )
        
        db.session.add(notification)
        db.session.commit()
        
        # Send push notification via FCM (mobile) AND Web Push (web/PWA)
        try:
            from app.services.fcm_service import FCMService
            from app.services.web_push_service import WebPushService
            from app.models.device_token import DeviceToken
            
            data = {
                "notification_id": str(notification.id),
                "type": type,
                "link_type": link_type or "",
                "link_id": str(link_id) if link_id else ""
            }
            
            # Get all active devices for this user
            devices = DeviceToken.query.filter_by(
                user_id=user_id,
                is_active=True
            ).all()
            
            results = []
            for device in devices:
                if device.platform in ['ios', 'android'] and device.token:
                    # Mobile: FCM Push
                    result = FCMService.send_notification(
                        device.token,
                        title,
                        message,
                        data
                    )
                    results.append({"platform": device.platform, **result})
                    
                elif device.platform == 'web' and device.subscription_endpoint:
                    # Web/PWA: Web Push
                    subscription = {
                        "endpoint": device.subscription_endpoint,
                        "keys": {
                            "p256dh": device.subscription_p256dh,
                            "auth": device.subscription_auth
                        }
                    }
                    result = WebPushService.send_notification(
                        subscription,
                        title,
                        message,
                        data
                    )
                    results.append({"platform": "web", **result})
                    
                    # Deactivate invalid subscriptions
                    if result.get("should_delete"):
                        device.is_active = False
            
            if devices:
                db.session.commit()
                print(f"📱 Push sent to {len(devices)} devices: {len(results)} successful")
            
        except Exception as e:
            print(f"❌ Push notification error (notification still saved): {e}")
        
        return notification

    @staticmethod
    def broadcast_notification(title, message, type='system'):
        """
        Sends a notification to ALL users.
        """
        from app.models.user import User
        from app.utils.timezone import now_cuiaba
        
        users = User.query.all()
        
        count = 0
        for user in users:
            n = Notification(
                user_id=user.id,
                type=type,
                title=title,
                message=message,
                created_at=now_cuiaba()
            )
            db.session.add(n)
            count += 1
            
        db.session.commit()
        return count
