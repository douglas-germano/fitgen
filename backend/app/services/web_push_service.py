from pywebpush import webpush, WebPushException
import json
import os

class WebPushService:
    
    @staticmethod
    def send_notification(subscription, title, body, data=None):
        """
        Send web push notification to browser
        
        Args:
            subscription: dict with endpoint, keys (p256dh, auth)
            title: Notification title
            body: Notification body/message
            data: Optional dict with custom data
            
        Returns:
            dict with success status
        """
        
        vapid_private_key_file = os.getenv('VAPID_PRIVATE_KEY_FILE')
        vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
        vapid_subject = os.getenv('VAPID_SUBJECT', 'mailto:contato@fitgen.app')
        
        #  Try to load from file first, then env var
        if vapid_private_key_file and os.path.exists(vapid_private_key_file):
            with open(vapid_private_key_file, 'r') as f:
                vapid_private_key = f.read()
        
        if not vapid_private_key:
            print("⚠️ VAPID_PRIVATE_KEY not configured")
            return {"success": False, "error": "VAPID keys not configured"}
        
        vapid_claims = {"sub": vapid_subject}
        
        payload = json.dumps({
            "title": title,
            "body": body,
            "data": data or {},
            "icon": "/icon-192.png",
            "badge": "/badge.png"
        })
        
        try:
            response = webpush(
                subscription_info=subscription,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims
            )
            print(f"✅ Web Push sent successfully")
            return {"success": True, "response": response}
            
        except WebPushException as e:
            status_code = e.response.status_code if e.response else None
            print(f"❌ Web Push Error: {e} (status: {status_code})")
            
            # 404 or 410 means subscription is invalid/expired
            should_delete = status_code in [404, 410]
            
            return {
                "success": False, 
                "error": str(e),
                "should_delete": should_delete
            }
        except Exception as e:
            print(f"❌ Unexpected Web Push Error: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def send_to_user_web(user_id):
        """
        Send web push to all user's web subscriptions
        
        Args:
            user_id: User UUID
            title: Notification title
            body: Notification body
            data: Optional custom data
            
        Returns:
            List of results
        """
        from app.models.device_token import DeviceToken
        from app.extensions import db
        
        # Get all web platform subscriptions
        devices = DeviceToken.query.filter_by(
            user_id=user_id,
            platform='web',
            is_active=True
        ).filter(
            DeviceToken.subscription_endpoint.isnot(None)
        ).all()
        
        if not devices:
            print(f"⚠️ No web push subscriptions for user {user_id}")
            return []
        
        results = []
        for device in devices:
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
                body,
                data
            )
            
            # Deactivate invalid subscriptions
            if result.get("should_delete"):
                device.is_active = False
                db.session.commit()
                print(f"🗑️ Deactivated invalid web subscription {device.id}")
            
            results.append({
                "device_id": device.id,
                "platform": "web",
                **result
            })
        
        return results
