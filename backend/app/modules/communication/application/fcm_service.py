import firebase_admin
from firebase_admin import credentials, messaging
import os

class FCMService:
    _initialized = False
    
    @staticmethod
    def initialize():
        """Initialize Firebase Admin SDK"""
        if not FCMService._initialized:
            cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', '/app/firebase-credentials.json')
            if os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    FCMService._initialized = True
                    print(f"✅ Firebase initialized with credentials from {cred_path}")
                except Exception as e:
                    print(f"❌ Firebase initialization failed: {e}")
            else:
                print(f"⚠️ Firebase credentials not found at {cred_path}")
    
    @staticmethod
    def send_notification(token, title, body, data=None):
        """
        Send push notification to a specific device token
        
        Args:
            token: FCM device token
            title: Notification title
            body: Notification body/message
            data: Optional dict with custom data
            
        Returns:
            dict with success status and message_id or error
        """
        try:
            FCMService.initialize()
            
            if not FCMService._initialized:
                return {"success": False, "error": "Firebase not initialized"}
            
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                token=token,
                # Android specific config
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound='default',
                        channel_id='default'
                    )
                ),
                # iOS specific config
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound='default',
                            badge=1
                        )
                    )
                )
            )
            
            response = messaging.send(message)
            print(f"✅ Push notification sent: {response}")
            return {"success": True, "message_id": response}
            
        except messaging.UnregisteredError:
            print(f"❌ Token unregistered: {token}")
            return {"success": False, "error": "unregistered", "should_delete": True}
        except Exception as e:
            print(f"❌ FCM Error: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def send_to_user(user_id, title, body, data=None):
        """
        Send push notification to all user's devices
        
        Args:
            user_id: User UUID
            title: Notification title
            body: Notification body
            data: Optional dict with custom data
            
        Returns:
            List of results for each device
        """
        from app.modules.communication.domain.device_token import DeviceToken
        from app.shared.extensions import db
        
        tokens = DeviceToken.query.filter_by(
            user_id=user_id,
            is_active=True
        ).all()
        
        if not tokens:
            print(f"⚠️ No active device tokens for user {user_id}")
            return []
        
        results = []
        for device in tokens:
            result = FCMService.send_notification(
                device.token,
                title,
                body,
                data
            )
            
            # Deactivate unregistered tokens
            if result.get("should_delete"):
                device.is_active = False
                db.session.commit()
                print(f"🗑️ Deactivated invalid token for device {device.id}")
            
            results.append({
                "device_id": device.id,
                "platform": device.platform,
                **result
            })
        
        return results
    
    @staticmethod
    def send_multicast(tokens, title, body, data=None):
        """
        Send to multiple tokens at once (more efficient)
        
        Args:
            tokens: List of FCM tokens
            title: Notification title
            body: Notification body
            data: Optional dict with custom data
            
        Returns:
            MulticastMessage response
        """
        try:
            FCMService.initialize()
            
            if not FCMService._initialized:
                return {"success": False, "error": "Firebase not initialized"}
            
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                tokens=tokens
            )
            
            response = messaging.send_multicast(message)
            print(f"✅ Multicast sent: {response.success_count}/{len(tokens)} successful")
            
            return {
                "success": True,
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "responses": response.responses
            }
            
        except Exception as e:
            print(f"❌ Multicast Error: {e}")
            return {"success": False, "error": str(e)}
